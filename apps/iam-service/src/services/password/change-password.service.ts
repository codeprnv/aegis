/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  EDGE_REVOCATION_TTL_SECONDS,
  REDIS_AUTH_KEYS,
  REDIS_REVOKED_SENTINEL,
} from '@aegis/auth';
import { logger, validatePassword, verifyPassword } from '@aegis/common';
import { prisma, redis } from '@aegis/database';
import { enqueueNotification, NotificationEvent } from '@aegis/events';
import { BadRequestError } from '@aegis/middlewares';
import { SESSION_REVOCATION_REASONS } from '../../config/index.js';
import {
  canUsePassword,
  validateAndStorePassword,
} from './password-history.service';

/**
 * Executes a self-service password change for an authenticated user,
 * invalidating all alternative active sessions.
 *
 * @param userId - Unique identifier of the authenticated user
 * @param currentPassword - Existing plaintext password for verification
 * @param newPassword - Proposed plaintext password
 * @param currentSessionId - Optional session ID to retain as active
 * @returns Count of revoked sessions terminated during the password rotation
 * @throws {BadRequestError} When credentials or policy validation fails
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentSessionId?: string
): Promise<{ revokedSessions: number }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new BadRequestError('User not found!');
  }

  const isCurrentPasswordValid = await verifyPassword(
    currentPassword,
    user.passwordHash || ''
  );

  if (!isCurrentPasswordValid) {
    throw new BadRequestError('Current password is incorrect!');
  }

  const passwordValidation = await validatePassword(newPassword);
  if (!passwordValidation.success && passwordValidation.error) {
    throw new BadRequestError(passwordValidation.error || 'Invalid password!');
  }

  const isSamePassword = await verifyPassword(
    newPassword,
    user.passwordHash || ''
  );

  if (isSamePassword) {
    throw new BadRequestError(
      'New password must be different from current password!'
    );
  }

  await canUsePassword(userId, newPassword);
  await validateAndStorePassword(userId, newPassword);

  const activeSessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      id: currentSessionId ? { not: currentSessionId } : undefined,
    },
    select: { id: true },
  });

  let revokedSessionsCount = 0;

  if (activeSessions.length > 0) {
    const sessionIds = activeSessions.map((s) => s.id);
    const pipeline = redis.pipeline();
    for (const id of sessionIds) {
      const key = REDIS_AUTH_KEYS.REVOKED_SESSION(id);
      if (typeof (pipeline as any).setex === 'function') {
        (pipeline as any).setex(
          key,
          EDGE_REVOCATION_TTL_SECONDS,
          REDIS_REVOKED_SENTINEL
        );
      } else {
        pipeline.set(key, REDIS_REVOKED_SENTINEL, {
          ex: EDGE_REVOCATION_TTL_SECONDS,
        });
      }
    }

    await pipeline.exec();

    const result = await prisma.session.updateMany({
      where: { id: { in: sessionIds } },
      data: {
        revokedAt: new Date(),
        revokedReason: SESSION_REVOCATION_REASONS.PASSWORD_CHANGE_BY_USER,
      },
    });
    revokedSessionsCount = result.count;
  }

  enqueueNotification(NotificationEvent.PASSWORD_CHANGED, {
    userId: user.id,
    email: user.email,
    username: user.username,
  }).catch((err: Error) =>
    logger.error(
      { error: err.message, userId: user.id },
      'Failed to enqueue password changed email'
    )
  );

  logger.info({
    message: 'Password changed successfully',
    userId: user.id,
    email: user.email,
    revokedSessions: revokedSessionsCount,
  });

  return { revokedSessions: revokedSessionsCount };
};
