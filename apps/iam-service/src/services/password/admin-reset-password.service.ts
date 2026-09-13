import { hashPassword, logger } from '@aegis/common';
import { prisma } from '@aegis/database';
import { enqueueNotification, NotificationEvent } from '@aegis/events';
import { BadRequestError, ForbiddenError } from '@aegis/middlewares';
import crypto from 'crypto';

/**
 * Generates an administrative temporary password adhering to complexity requirements.
 * Excludes ambiguous characters (O, 0, I, 1) to prevent transcription errors.
 *
 * @returns Temporary password string
 */
const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ23456789';
  const randomChars = Array.from({ length: 6 }, () =>
    chars.charAt(crypto.randomInt(0, chars.length))
  ).join('');

  return `TempPass#${randomChars}`;
};

/**
 * Administratively resets a target user's credentials, flags the account for mandatory
 * password change on subsequent authentication, and revokes all existing active sessions.
 *
 * @param adminUserId - User ID of the initiating administrator
 * @param targetUserId - User ID of the account undergoing password reset
 * @returns Temporary password assigned to the account
 * @throws {BadRequestError} If administrator or target user does not exist, or if self-reset is attempted
 * @throws {ForbiddenError} If initiating user lacks ADMIN role or attempts to reset another administrator
 */
export const adminResetPassword = async (
  adminUserId: string,
  targetUserId: string
): Promise<{ temporaryPassword: string }> => {
  const admin = await prisma.user.findUnique({
    where: { id: adminUserId },
    select: { id: true, role: true, email: true },
  });

  if (!admin) {
    throw new BadRequestError('Admin user not found!');
  }

  if (admin.role !== 'ADMIN') {
    throw new ForbiddenError('Insufficient permissions to reset passwords');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, username: true },
  });

  if (!targetUser) {
    throw new BadRequestError('Target user not found!');
  }

  if (targetUser.id === adminUserId) {
    throw new BadRequestError(
      'Admin cannot reset their own password. Use change password instead'
    );
  }

  if (targetUser.role === 'ADMIN') {
    throw new ForbiddenError('Admin cannot reset other admin password');
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        forcePasswordChange: true,
      },
    });

    await tx.passwordHistory.create({
      data: {
        userId: targetUserId,
        passwordHash,
      },
    });

    await tx.session.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Password reset by admin!',
      },
    });
  });

  enqueueNotification(NotificationEvent.ADMIN_PASSWORD_RESET, {
    userId: targetUserId,
    email: targetUser.email,
    username: targetUser.username,
    temporaryPassword,
  }).catch((err: Error) =>
    logger.error({ error: err.message, targetUserId }, 'Failed to enqueue admin password reset email')
  );

  logger.warn({
    message: 'Admin reset user password',
    adminId: adminUserId,
    adminEmail: admin.email,
    targetUserId,
    targetUserEmail: targetUser.email,
  });

  return { temporaryPassword };
};

/**
 * Checks whether a given user is flagged for mandatory password change.
 *
 * @param userId - Unique identifier of the user
 * @returns Boolean indicating whether password change is mandatory
 */
export const shouldForcePasswordChange = async (
  userId: string
): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { forcePasswordChange: true },
  });

  return user?.forcePasswordChange || false;
};
