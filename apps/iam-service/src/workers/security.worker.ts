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
  SECURITY_REVOCATION_QUEUE_NAME,
  SecurityEvent,
  type AuthSessionRevokePayload,
} from '@aegis/events';
import { Job, Worker } from 'bullmq';
import { SESSION_REVOCATION_REASONS } from '../config/index.js';

/**
 * Initializes and starts the BullMQ consumer for security events requiring IAM intervention.
 * Listens exclusively to the security revocations queue to prevent competing-consumer contention.
 *
 * @returns Active BullMQ Worker instance
 */
export const startSecurityWorker = (): Worker => {
  logger.info('Starting IAM BullMQ Security Worker...');

  const worker = new Worker(
    SECURITY_REVOCATION_QUEUE_NAME,
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
          const {
            userId,
            sessionId,
            reason,
            lockAccount,
            forcePasswordChange,
            revokeAllUserSessions,
          } = payload;

          if (!userId) {
            logger.warn(
              {
                jobId: job.id,
                data: job.data,
              },
              `Invalid session revocation payload: missing userId`
            );
            return;
          }

          // 1. Invalidate session(s) in the database
          let count = 0;
          if (revokeAllUserSessions || !sessionId) {
            const updateResult = await prisma.session.updateMany({
              where: {
                userId,
                revokedAt: null,
              },
              data: {
                revokedAt: new Date(),
                revokedReason: reason || SESSION_REVOCATION_REASONS.AUDIT_ANOMALY,
              },
            });
            count = updateResult.count;
          } else if (sessionId) {
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
            count = updateResult.count;
          }

          // 2. Enforce Tier 1 compromise account lock and password change
          if (lockAccount || forcePasswordChange) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                ...(forcePasswordChange ? { forcePasswordChange: true } : {}),
                ...(lockAccount
                  ? {
                      accountLocked: true,
                      accountLockedAt: new Date(),
                      accountLockedReason:
                        reason || 'Account locked due to security anomaly',
                    }
                  : {}),
              },
            });
          }

          // 3. Edge blocklist writes: write session and user sentinels to Redis
          const redisOperations: Promise<any>[] = [];
          if (sessionId) {
            redisOperations.push(
              redis.setex(
                REDIS_AUTH_KEYS.REVOKED_SESSION(sessionId),
                EDGE_REVOCATION_TTL_SECONDS,
                REDIS_REVOKED_SENTINEL
              )
            );
          }
          if (revokeAllUserSessions || lockAccount) {
            redisOperations.push(
              redis.setex(
                REDIS_AUTH_KEYS.REVOKED_USER(userId),
                EDGE_REVOCATION_TTL_SECONDS,
                REDIS_REVOKED_SENTINEL
              )
            );
          }
          await Promise.all(redisOperations);

          logger.info(
            {
              userId,
              sessionId,
              count,
              lockAccount: !!lockAccount,
              forcePasswordChange: !!forcePasswordChange,
            },
            'Successfully processed security revocation and account lockdown'
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
