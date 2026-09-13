import { logger } from '@aegis/common';
import { notificationPrisma } from '@aegis/database';
import { createBullMQConnection, NOTIFICATION_QUEUE_NAME } from '@aegis/events';
import { NotificationStatus } from '@aegis/types';
import { Job, Worker } from 'bullmq';
import { sendEmail } from '../channels/email.channel';
import { NOTIFICATION_WORKER_CONFIG } from '../config/index.js';

export const startEmailWorker = (): Worker => {
  logger.info(`Starting BullMQ Email Worker...`);
  const worker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job) => {
      logger.info(`Processing job ${job.id} (Event: ${job.name})`);

      try {
        // Idempotency: Check if job is already processed
        const existingNotification =
          await notificationPrisma.notification.findUnique({
            where: { idempotencyKey: job.id! },
          });

        if (
          existingNotification &&
          existingNotification.status === NotificationStatus.SENT
        ) {
          logger.info(`Job ${job.id} already processed. Skipping.`);
          return;
        }

        let notificationId = existingNotification?.id;

        if (!existingNotification) {
          const newNotif = await notificationPrisma.notification.create({
            data: {
              eventType: job.name,
              recipientId: job.data.userId || 'unknown',
              recipientEmail: job.data.email,
              idempotencyKey: job.id!,
              status: NotificationStatus.PENDING,
              attempts: 1,
              lastAttemptAt: new Date(),
            },
          });
          notificationId = newNotif.id;
        } else {
          await notificationPrisma.notification.update({
            where: { id: existingNotification.id },
            data: {
              attempts: { increment: 1 },
              lastAttemptAt: new Date(),
            },
          });
        }

        // Dispatch to email channel
        const providerMessageId = await sendEmail(job.name, job.data);

        await notificationPrisma.notification.update({
          where: { id: notificationId },
          data: {
            status: NotificationStatus.SENT,
            sentAt: new Date(),
            providerMessageId: providerMessageId,
          },
        });

        logger.info(`Successfully processed job ${job.id}`);
      } catch (error: any) {
        logger.error(`Failed to process job ${job.id}: ${error.message}`);

        // Log failure safely without masking the original exception
        if (job.id) {
          await notificationPrisma.notification
            .updateMany({
              where: { idempotencyKey: job.id },
              data: {
                status: NotificationStatus.FAILED,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
              },
            })
            .catch((dbErr) => {
              logger.warn(
                { dbErr },
                `Could not update failure status for job ${job.id}`
              );
            });
        }

        throw error; // Throwing triggers BullMQ's automatic exponential backoff retry
      }
    },
    {
      connection: createBullMQConnection() as any,
      drainDelay: NOTIFICATION_WORKER_CONFIG.DRAIN_DELAY_SECONDS,
      concurrency: NOTIFICATION_WORKER_CONFIG.CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
};
