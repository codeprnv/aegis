import { logger } from '@aegis/common';
import { prisma } from '@aegis/database';
import cron from 'node-cron';

export async function cleanupExpiredSessions() {
  try {
    const cutOfDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 Days

    // Delete expired sessions
    const expiredResult = await prisma.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            revokedAt: { not: null, lt: cutOfDate }, // Revoked in last 30 days,
          },
        ],
      },
    });

    //   Delete old password resets
    const resetResult = await prisma.passwordReset.deleteMany({
      where: {
        OR: [
          { tokenExpiresAt: { lt: new Date() } },
          {
            otpUsed: true,
            otpUsedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
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

// Schedule clean daily at 2 AM
export function startSessionCleanupJob() {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled session cleanup');
    await cleanupExpiredSessions();
  });

  logger.info('Session cleanup job scheduled (daily at 2 AM)');
}
