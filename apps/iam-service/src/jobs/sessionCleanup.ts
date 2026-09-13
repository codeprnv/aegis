import { logger } from '@aegis/common';
import { prisma } from '@aegis/database';
import cron from 'node-cron';
import { IAM_SESSION_CONFIG } from '../config/index.js';

export async function cleanupExpiredSessions() {
  try {
    const cutOfDate = new Date(
      Date.now() - IAM_SESSION_CONFIG.RETENTION_WINDOWS.EXPIRED_SESSIONS_MS
    );

    // Delete sessions expired or revoked beyond the retention threshold
    const expiredResult = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: cutOfDate } },
          {
            revokedAt: { not: null, lt: cutOfDate },
          },
        ],
      },
    });

    // Delete completed password resets beyond the retention threshold
    const resetResult = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          { tokenExpiresAt: { lt: new Date() } },
          {
            otpUsed: true,
            otpUsedAt: {
              lt: new Date(
                Date.now() -
                  IAM_SESSION_CONFIG.RETENTION_WINDOWS.COMPLETED_RESETS_MS
              ),
            },
          },
        ],
      },
    });

    logger.info({
      message: 'Session cleanup completed',
      sessionsDeleted: expiredResult.count,
      passwordResetsDeleted: resetResult.count,
    });

    return {
      sessionsDeleted: expiredResult.count,
      passwordResetsDeleted: resetResult.count,
    };
  } catch (error) {
    logger.error({
      message: 'Session cleanup failed',
      error: error,
    });

    throw error;
  }
}

// Schedule clean daily at configured cron schedule
export function startSessionCleanupJob() {
  cron.schedule(IAM_SESSION_CONFIG.SESSION_CLEANUP_CRON, async () => {
    logger.info('Starting scheduled session cleanup');
    await cleanupExpiredSessions();
  });

  logger.info('Session cleanup job scheduled');
}
