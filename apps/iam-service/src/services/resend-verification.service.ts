import { hashTokenSHA256, logger } from '@aegis/common';
import { redis } from '@aegis/database';
import { randomBytes } from 'crypto';

export async function resendVerificationEmail(email: string): Promise<void> {
  try {
    const existingTokenHash = await redis.get<string>(`registration:email:${email}`);
    
    if (!existingTokenHash) {
      logger.info({ email }, 'No pending verification found for resend request');
      return;
    }
    
    const pendingData = await redis.get<any>(`registration:${existingTokenHash}`);
    if (!pendingData) {
      logger.info({ email }, 'Pending registration data expired');
      return;
    }

    // Rotate and generate a fresh raw verification token and hash
    const newRawToken = randomBytes(32).toString('hex');
    const newTokenHash = hashTokenSHA256(newRawToken);

    // Replace old hash in Redis with new hash
    await redis.del(`registration:${existingTokenHash}`);
    await redis.setex(`registration:${newTokenHash}`, 86400, pendingData);
    await redis.setex(`registration:email:${email}`, 86400, newTokenHash);
    await redis.setex(`registration:username:${pendingData.username}`, 86400, newTokenHash);

    import('@aegis/events')
      .then(({ enqueueNotification, NotificationEvent }) => {
        enqueueNotification(
          NotificationEvent.EMAIL_VERIFICATION_REQUESTED,
          {
            userId: 'pending',
            email: pendingData.email,
            username: pendingData.username,
            verificationToken: newRawToken,
          }
        );
      })
      .catch((err) => {
        logger.error(err, 'Failed to enqueue resend verification email');
      });

    logger.info({ email }, 'Re-dispatched fresh email verification event');
  } catch (error) {
    logger.error(
      { error, email },
      'Failed to process resend verification email request'
    );
  }
}
