import { hashTokenSHA256, logger } from '@aegis/common';
import { redis } from '@aegis/database';
import { enqueueNotification, NotificationEvent } from '@aegis/events';
import { randomBytes } from 'crypto';

/**
 * Re-issues and dispatches a fresh email verification token for a pending registration.
 * Rotates the cryptographic token in Redis while preserving the staged registration payload.
 *
 * @param email - Target user's email address
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const existingTokenHash = await redis.get<string>(
      `registration:email:${normalizedEmail}`
    );

    if (!existingTokenHash) {
      logger.info(
        { email },
        'No pending verification found for resend request'
      );
      return;
    }

    const pendingData = await redis.get<any>(
      `registration:${existingTokenHash}`
    );
    if (!pendingData) {
      logger.info({ email }, 'Pending registration data expired');
      return;
    }

    const newRawToken = randomBytes(32).toString('hex');
    const newTokenHash = hashTokenSHA256(newRawToken);

    await redis.del(`registration:${existingTokenHash}`);
    await redis.setex(`registration:${newTokenHash}`, 86400, pendingData);
    await redis.setex(`registration:email:${email}`, 86400, newTokenHash);
    await redis.setex(
      `registration:username:${pendingData.username}`,
      86400,
      newTokenHash
    );

    enqueueNotification(NotificationEvent.EMAIL_VERIFICATION_REQUESTED, {
      userId: 'pending',
      email: pendingData.email,
      username: pendingData.username,
      verificationToken: newRawToken,
    }).catch((err: Error) => {
      logger.error({ error: err.message, email }, 'Failed to enqueue resend verification email');
    });

    logger.info({ email }, 'Re-dispatched fresh email verification event');
  } catch (error) {
    logger.error(
      { error, email },
      'Failed to process resend verification email request'
    );
  }
}
