import {
  AUTH_CONFIG,
  hashPassword,
  logger,
  verifyPassword,
} from '@aegis/common';
import { prisma } from '@aegis/database';
import { ConflictError } from '@aegis/middlewares';

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

  // Check passwords sequentially to prevent Argon2 DoS (RAM spike)
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

// Validate and store new Password
export const validateAndStorePassword = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  const newPasswordHash = await hashPassword(newPassword);
  // Transaction to ensure atomicity
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    //   Store in history
    await tx.passwordHistory.create({
      data: {
        userId,
        passwordHash: newPasswordHash,
        changedAt: new Date(),
      },
    });

    //   Clean up old history
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

// Check password against history before allowing change
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
