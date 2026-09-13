import { hashTokenSHA256, logger } from '@aegis/common';
import { redis } from '@aegis/database';
import { enqueueNotification, NotificationEvent } from '@aegis/events';
import { randomBytes } from 'crypto';
import {
  IAM_REGISTRATION_CONFIG,
  REDIS_REGISTRATION_KEYS,
} from '../../config/index.js';

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
      REDIS_REGISTRATION_KEYS.PENDING_EMAIL(normalizedEmail)
    );

    if (!existingTokenHash) {
      logger.info(
        { email },
        'No pending verification found for resend request'
      );
      return;
    }

    const pendingData = await redis.get<any>(
      REDIS_REGISTRATION_KEYS.PENDING_PAYLOAD(existingTokenHash)
    );
    if (!pendingData) {
      logger.info({ email }, 'Pending registration data expired');
      return;
    }

    const newRawToken = randomBytes(
      IAM_REGISTRATION_CONFIG.TOKEN_BYTE_LENGTH
    ).toString('hex');
    const newTokenHash = hashTokenSHA256(newRawToken);

    await redis.del(
      REDIS_REGISTRATION_KEYS.PENDING_PAYLOAD(existingTokenHash)
    );
    await redis.setex(
      REDIS_REGISTRATION_KEYS.PENDING_PAYLOAD(newTokenHash),
      IAM_REGISTRATION_CONFIG.STAGING_TTL_SECONDS,
      pendingData
    );
    await redis.setex(
      REDIS_REGISTRATION_KEYS.PENDING_EMAIL(email),
      IAM_REGISTRATION_CONFIG.STAGING_TTL_SECONDS,
      newTokenHash
    );
    await redis.setex(
      REDIS_REGISTRATION_KEYS.PENDING_USERNAME(pendingData.username),
      IAM_REGISTRATION_CONFIG.STAGING_TTL_SECONDS,
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
