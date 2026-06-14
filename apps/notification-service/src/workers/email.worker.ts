import { logger } from '@aegis/common';
import { createBullMQConnection } from '@aegis/events';
import { Job, Worker } from 'bullmq';
import { sendEmail } from '../channels/email.channel';

const QUEUE_NAME = 'aegis-notifications';

export const startEmailWorker = (): Worker => {
  logger.info(`Starting BullMQ Email Worker...`);
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      logger.info(`Processing job ${job.id} (Event: ${job.name})`);

      try {
        const { prisma } = require('@aegis/database');

        // Idempotency: Check if job is already processed
        const existingNotification = await prisma.notification.findUnique({
          where: { idempotencyKey: job.id! },
        });

        if (existingNotification && existingNotification.status === 'sent') {
          logger.info(`Job ${job.id} already processed. Skipping.`);
          return;
        }

        let notificationId = existingNotification?.id;

        if (!existingNotification) {
          const newNotif = await prisma.notification.create({
            data: {
              eventType: job.name,
              recipientId: job.data.userId || 'unknown',
              recipientEmail: job.data.email,
              idempotencyKey: job.id!,
              status: 'pending',
              attempts: 1,
              lastAttemptAt: new Date(),
            },
          });
          notificationId = newNotif.id;
        } else {
          await prisma.notification.update({
            where: { id: existingNotification.id },
            data: {
              attempts: { increment: 1 },
              lastAttemptAt: new Date(),
            },
          });
        }

        // Dispatch to email channel
        const providerMessageId = await sendEmail(job.name, job.data);

        await prisma.notification.update({
          where: { id: notificationId },
          data: {
            status: 'sent',
            sentAt: new Date(),
            providerMessageId: providerMessageId,
          },
        });

        logger.info(`Successfully processed job ${job.id}`);
      } catch (error: any) {
        logger.error(`Failed to process job ${job.id}: ${error.message}`);

        const { prisma } = require('@aegis/database');
        // Log failure
        await prisma.notification.update({
          where: { idempotencyKey: job.id! },
          data: {
            status: 'failed',
            errorMessage: error.message,
          },
        });

        throw error; // Throwing triggers BullMQ's automatic exponential backoff retry
      }
    },
    {
      connection: createBullMQConnection() as any,
      drainDelay: 60,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
};
