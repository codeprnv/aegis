/* TODO: Implement initial admin user */

import { hashPassword, logger } from '@aegis/common';
import { prisma } from '@aegis/database';
import { BadRequestError, ForbiddenError } from '@aegis/middlewares';

// Generate temporary password (admin action)
// Format: TempPass#2024AB

const generateTemporaryPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNOPQRSTUVWXYZ23456789'; // Excluding lowercase letters and confusing chars (O, 0, I, 1)
  const randomChars = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');

  return `TempPass#${randomChars}`;
};

// Admin reset user password
export const adminResetPassword = async (
  adminUserId: string,
  targetUserId: string
): Promise<{ temporaryPassword: string }> => {
  // Verify admin has permission
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

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, username: true },
  });

  if (!targetUser) {
    throw new BadRequestError('Target user not found!');
  }

  // Prevent self-reset
  if (targetUser.id === adminUserId) {
    throw new BadRequestError(
      'Admin cannot reset their own password. Use change password instead'
    );
  }

  // Prevent resetting other admin password
  if (targetUser.role === 'ADMIN') {
    throw new ForbiddenError('Admin cannot reset other admin password');
  }

  // Generate temporary password
  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  await prisma.$transaction(async (tx) => {
    // Update user password and set force change flag
    await tx.user.update({
      where: { id: targetUserId },
      data: {
        passwordHash: passwordHash,
        passwordChangedAt: new Date(),
        forcePasswordChange: true, // Force user to change password on next login
      },
    });

    // Store in password history
    await tx.passwordHistory.create({
      data: {
        userId: targetUserId,
        passwordHash: passwordHash,
      },
    });

    // Revoke all sessions
    await tx.session.updateMany({
      where: { userId: targetUserId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Password reset by admin!',
      },
    });
  });
  // TODO: Send email to user with temporary password

  // Debug: For development
  logger.warn({
    message: 'Admin reset user password',
    adminId: adminUserId,
    adminEmail: admin.email,
    targetUserId: targetUserId,
    targetUserEmail: targetUser.email,
  });

  return { temporaryPassword };
};

// Check if user is forced to change password
export const shouldForcePasswordChange = async (
  userId: string
): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { forcePasswordChange: true },
  });

  return user?.forcePasswordChange || false;
};
