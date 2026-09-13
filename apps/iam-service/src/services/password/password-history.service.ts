import {
  AUTH_CONFIG,
  hashPassword,
  logger,
  verifyPassword,
} from '@aegis/common';
import { prisma } from '@aegis/database';
import { ConflictError } from '@aegis/middlewares';

/**
 * Checks whether a candidate password matches any recent password in the user's history.
 * Verifies hashes sequentially to throttle computational overhead and prevent Argon2 memory spikes.
 *
 * @param userId - Unique identifier of the user
 * @param newPassword - Plaintext candidate password to check
 * @returns Boolean indicating whether the password was recently used
 */
export const isPasswordReused = async (
  userId: string,
  newPassword: string
): Promise<boolean> => {
  const history = await prisma.passwordHistory.findMany({
    where: { userId },
    orderBy: { changedAt: 'desc' },
    take: AUTH_CONFIG.PASSWORD_HISTORY_LIMIT,
    select: {
      passwordHash: true,
      changedAt: true,
    },
  });

  for (const record of history) {
    const isMatch = await verifyPassword(newPassword, record.passwordHash);
    if (isMatch) {
      logger.warn({
        message: 'Password reuse detected',
        userId,
        lastUsed: record.changedAt,
      });
      return true;
    }
  }

  return false;
};

/**
 * Validates, hashes, and stores a new password in PostgreSQL, recording the previous hash
 * in password history and pruning history beyond the configured retention limit.
 *
 * @param userId - Unique identifier of the user
 * @param newPassword - Plaintext password to store
 */
export const validateAndStorePassword = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  const newPasswordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.passwordHistory.create({
      data: {
        userId,
        passwordHash: newPasswordHash,
        changedAt: new Date(),
      },
    });

    const oldHistory = await tx.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      skip: AUTH_CONFIG.PASSWORD_HISTORY_LIMIT,
      select: { id: true },
    });

    if (oldHistory.length > 0) {
      await tx.passwordHistory.deleteMany({
        where: {
          id: { in: oldHistory.map((h) => h.id) },
        },
      });
    }
  });

  logger.info({ message: 'Password updated successfully!', userId });
};

/**
 * Asserts that a new password does not violate the password history reuse policy.
 *
 * @param userId - Unique identifier of the user
 * @param newPassword - Plaintext password to evaluate
 * @throws {ConflictError} When the candidate password matches a recent history entry
 */
export const canUsePassword = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  const isReused = await isPasswordReused(userId, newPassword);

  if (isReused) {
    throw new ConflictError(
      `Cannot reuse any of your last ${AUTH_CONFIG.PASSWORD_HISTORY_LIMIT} password(s)`
    );
  }
};
