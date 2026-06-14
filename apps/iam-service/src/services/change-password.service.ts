import { logger, validatePassword, verifyPassword } from '@aegis/common';
import { prisma } from '@aegis/database';
import { BadRequestError } from '@aegis/middlewares';
import {
  canUsePassword,
  validateAndStorePassword,
} from './password-history.service';

// Change password - authenticated user
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
      passwordHash: true,
    },
  });

  if (!user) {
    throw new BadRequestError('User not found!');
  }

  // Verify the current password
  const isCurrentPasswordValid = await verifyPassword(
    currentPassword,
    user.passwordHash || ''
  );

  if (!isCurrentPasswordValid) {
    throw new BadRequestError('Current password is incorrect!');
  }

  // Validate new password against password policy
  const passwordValidation = await validatePassword(newPassword);
  if (passwordValidation.success === false && passwordValidation.error) {
    throw new BadRequestError(passwordValidation.error || 'Invalid password!');
  }

  // Check if the new password is same as the current password
  const isSamePassword = await verifyPassword(
    newPassword,
    user.passwordHash || ''
  );

  if (isSamePassword) {
    throw new BadRequestError(
      'New password must be different from current password!'
    );
  }

  // Check password history
  await canUsePassword(userId, newPassword);

  // Update password
  await validateAndStorePassword(userId, newPassword);

  // Revoke all sessions Except current session
  const result = await prisma.session.updateMany({
    where: {
      userId: userId,
      revokedAt: null,
      id: currentSessionId ? { not: currentSessionId } : undefined,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: 'Password change by user',
    },
  });

  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    enqueueNotification(NotificationEvent.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      username: user.email, // email as fallback
    });
  }).catch(err => logger.error('Failed to enqueue password changed email', err));
  // Debug: For development
  logger.info({
    message: 'Password changed successfully',
    userId: user.id,
    email: user.email,
    revokedSessions: result.count,
  });

  return { revokedSessions: result.count };
};
