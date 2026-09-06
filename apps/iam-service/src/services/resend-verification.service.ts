import { logger } from '@aegis/common';
import { redis } from '@aegis/database';

export async function resendVerificationEmail(email: string): Promise<void> {
  try {
    const keys = await redis.keys('registration:*');

    for (const key of keys) {
      const pendingData = await redis.get<any>(key);
      if (!pendingData) {
        continue;
      }

      if (pendingData.email === email) {
        const verificationToken = key.replace('registration:', '');

        import('@aegis/events')
          .then(({ enqueueNotification, NotificationEvent }) => {
            enqueueNotification(
              NotificationEvent.EMAIL_VERIFICATION_REQUESTED,
              {
                userId: 'pending',
                email: pendingData.email,
                username: pendingData.username,
                verificationToken,
              }
            );
          })
          .catch((err) => {
            logger.error(err, 'Failed to enqueue resend verification email');
          });

        logger.info({ email }, 'Re-dispatched email verification event');
        return;
      }
    }
    logger.debug({ email }, 'No pending verification found for resend request');
  } catch (error) {
    logger.error(
      { error, email },
      'Failed to process resend verification email request'
    );
  }
}
