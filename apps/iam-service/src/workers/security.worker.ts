/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EDGE_REVOCATION_TTL_SECONDS,
  REDIS_AUTH_KEYS,
  REDIS_REVOKED_SENTINEL,
} from '@aegis/auth';
import { logger } from '@aegis/common';
import { prisma, redis } from '@aegis/database';
import {
  createBullMQConnection,
  SECURITY_QUEUE_NAME,
  SecurityEvent,
  type AuthSessionRevokePayload,
} from '@aegis/events';
import { Job, Worker } from 'bullmq';
import { SESSION_REVOCATION_REASONS } from '../config/index.js';

/**
 * Initializes and starts the bullMQ consumer for security events requiring IAM intervention
 * @returns Active BullMQ Worker instance
 */
export const startSecurityWorker = (): Worker => {
  logger.info('Starting IAM BullMQ Security Worker...');

  const worker = new Worker(
    SECURITY_QUEUE_NAME,
    async (job: Job) => {
      logger.info(
        {
          jobId: job.id,
          event: job.name,
        },
        `Processing security job ${job.id}`
      );

      try {
        if (job.name === SecurityEvent.AUTH_SESSION_REVOKE) {
          const payload = job.data as AuthSessionRevokePayload;
          const { userId, sessionId, reason } = payload;

          if (!sessionId || !userId) {
            logger.warn(
              {
                jobId: job.id,
                data: job.data,
              },
              `Invalid session revocation payload: missing userId or sessionId`
            );
            return;
          }

          // Mark session as revoked in the database
          const updateResult = await prisma.session.updateMany({
            where: {
              id: sessionId,
              userId,
              revokedAt: null,
            },
            data: {
              revokedAt: new Date(),
              revokedReason: reason || SESSION_REVOCATION_REASONS.AUDIT_ANOMALY,
            },
          });

          // Edge blocklist write with 960-second TTL (15m access token + 60s buffer)
          await redis.setex(
            REDIS_AUTH_KEYS.REVOKED_SESSION(sessionId),
            EDGE_REVOCATION_TTL_SECONDS,
            REDIS_REVOKED_SENTINEL
          );

          logger.info(
            {
              userId,
              sessionId,
              count: updateResult.count,
            },
            'Successfully processed security session revocation'
          );
        }
      } catch (error: any) {
        logger.error(
          {
            jobId: job.id,
            error: error.message,
          },
          `Failed to process security job ${job.id}`
        );
        throw error;
      }
    },
    {
      connection: createBullMQConnection() as any,
      concurrency: 5,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        error: err.message,
      },
      `Security job ${job?.id} failed`
    );
  });
  return worker;
};
