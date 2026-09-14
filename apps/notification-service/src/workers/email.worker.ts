import { logger } from '@aegis/common';
import { notificationPrisma } from '@aegis/database';
import { createBullMQConnection, NOTIFICATION_QUEUE_NAME } from '@aegis/events';
import { NotificationStatus } from '@aegis/types';
import { Job, UnrecoverableError, Worker } from 'bullmq';
import {
  PermanentDeliveryError,
  sendEmail,
  UnrecognizedEventError,
} from '../channels/email.channel.js';
import { NOTIFICATION_WORKER_CONFIG } from '../config/index.js';

/**
 * Initializes and starts the BullMQ worker for the notification email queue.
 * Implements atomic PostgreSQL upserts to guarantee worker concurrency safety (NOTIF-01),
 * captures full template and subject audit telemetry (NOTIF-02), and classifies
 * non-retryable failures to prevent redundant BullMQ retry loops (NOTIF-05, NOTIF-06).
 *
 * @returns Active BullMQ Worker instance
 */
export const startEmailWorker = (): Worker => {
  logger.info('Starting BullMQ Email Worker...');

  const worker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job) => {
      logger.info(
        { jobId: job.id, event: job.name },
        `Processing email notification job ${job.id}`
      );

      const idempotencyKey =
        job.id || `${job.name}:${job.data?.userId || 'anon'}:${job.timestamp}`;

      try {
        // Atomic Upsert (NOTIF-01): Prevents P2002 duplicate key crashes under concurrency
        const notification = await notificationPrisma.notification.upsert({
          where: { idempotencyKey },
          create: {
            eventType: job.name,
            recipientId: job.data.userId || 'unknown',
            recipientEmail: job.data.email,
            idempotencyKey,
            status: NotificationStatus.PENDING,
            attempts: 1,
            lastAttemptAt: new Date(),
          },
          update: {
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });

        // Skip execution if already successfully delivered
        if (notification.status === NotificationStatus.SENT) {
          logger.info(
            { jobId: job.id },
            `Job ${job.id} already marked as SENT. Skipping duplicate dispatch.`
          );
          return;
        }

        // Dispatch to email channel (NOTIF-02, NOTIF-05, NOTIF-06)
        const { messageId, subject, templateName } = await sendEmail(
          job.name,
          job.data
        );

        // Record successful dispatch and audit metadata in database
        await notificationPrisma.notification.update({
          where: { id: notification.id },
          data: {
            status: NotificationStatus.SENT,
            subject,
            templateName,
            sentAt: new Date(),
            providerMessageId: messageId || null,
            errorMessage: null,
          },
        });

        logger.info(
          { jobId: job.id, messageId, templateName },
          `Successfully dispatched email notification for job ${job.id}`
        );
      } catch (error: any) {
        logger.error(
          { jobId: job.id, error: error.message },
          `Failed to process email job ${job.id}: ${error.message}`
        );

        const isUnrecognized = error instanceof UnrecognizedEventError;
        const isPermanent = error instanceof PermanentDeliveryError;

        let statusToRecord: NotificationStatus = NotificationStatus.FAILED;
        if (isUnrecognized) {
          statusToRecord = NotificationStatus.IGNORED;
        } else if (isPermanent) {
          statusToRecord = NotificationStatus.BOUNCED;
        }

        // Record failure state in database safely
        await notificationPrisma.notification
          .updateMany({
            where: { idempotencyKey },
            data: {
              status: statusToRecord,
              errorMessage:
                error instanceof Error ? error.message : String(error),
            },
          })
          .catch((dbErr) => {
            logger.warn(
              { dbErr, jobId: job.id },
              `Could not record failure state in database for job ${job.id}`
            );
          });

        if (isUnrecognized || isPermanent) {
          // Prevent BullMQ from retrying permanent bounces or unmapped events
          throw new UnrecoverableError(error.message);
        }

        // Rethrow transient errors so BullMQ applies configured exponential backoff
        throw error;
      }
    },
    {
      connection: createBullMQConnection() as any,
      drainDelay: NOTIFICATION_WORKER_CONFIG.DRAIN_DELAY_SECONDS,
      concurrency: NOTIFICATION_WORKER_CONFIG.CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message },
      `Notification job ${job?.id} permanently failed: ${err.message}`
    );
  });

  return worker;
};
