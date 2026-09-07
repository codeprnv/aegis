import {
  AUTH_CONFIG,
  hashPassword,
  hashTokenSHA256,
  logger,
  validatePassword,
} from '@aegis/common';
import { prisma } from '@aegis/database';
import { BadRequestError, UnauthorizedError } from '@aegis/middlewares';
import { randomBytes, randomInt } from 'crypto';
import { canUsePassword } from './password-history.service';

/**
 * Generates a secure 6-digit one-time password.
 * @returns 6-digit OTP string
 */
const generateOTP = (): string => {
  return randomInt(100000, 999999).toString();
};

/**
 * Initiates a password reset flow by creating a reset token and OTP,
 * and dispatching a notification email.
 * @param email - User's email address
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, username: true },
  });

  if (!user) {
    logger.info({
      message: 'Password reset requested for non-existent user',
      email,
    });
    return;
  }

  const otp = generateOTP();
  const token = randomBytes(32).toString('hex');
  const otpHash = hashTokenSHA256(otp);
  const tokenHash = hashTokenSHA256(token);

  const otpExpiry = new Date(
    Date.now() + AUTH_CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000
  );
  const tokenExpiry = new Date(
    Date.now() + AUTH_CONFIG.TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  await prisma.passwordReset.deleteMany({
    where: { userId: user.id },
  });

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash,
      otpHash: otpHash,
      tokenExpiresAt: tokenExpiry,
      otpExpiresAt: otpExpiry,
      otpAttempts: 0,
      otpUsed: false,
      tokenUsed: false,
    },
  });

  import('@aegis/events')
    .then(({ enqueueNotification, NotificationEvent }) => {
      enqueueNotification(NotificationEvent.PASSWORD_RESET_REQUESTED, {
        userId: user.id,
        email: user.email,
        username: user.username,
        otp: otp,
        otpExpiresAt: otpExpiry,
        resetToken: token,
      });
    })
    .catch((err) =>
      logger.error('Failed to enqueue password reset email', err)
    );

  logger.info({
    message: 'Password reset OTP sent',
    userId: user.id,
    otp: '[REDACTED]',
    otpExpiresAt: otpExpiry,
  });
};

/**
 * Verifies an OTP and securely updates the user's password within an atomic transaction.
 * @param email - User's registered email
 * @param otp - 6-digit one-time password
 * @param newPassword - New plaintext password
 */
export const resetPasswordWithOTP = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<void> => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, username: true },
  });

  if (!user) {
    throw new BadRequestError('Invalid credentials!');
  }

  const isPasswordValid = await validatePassword(newPassword);
  if (isPasswordValid.success === false && isPasswordValid.error) {
    throw new BadRequestError(isPasswordValid.error || 'Invalid password!');
  }

  const passwordResetRequest = await prisma.passwordReset.findFirst({
    where: {
      userId: user.id,
      otpExpiresAt: { gt: new Date() },
      otpUsed: false,
      tokenUsed: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!passwordResetRequest) {
    throw new BadRequestError(
      'No active password reset request found. Please request a new one!'
    );
  }

  if (passwordResetRequest.otpAttempts >= AUTH_CONFIG.MAX_OTP_ATTEMPTS) {
    throw new BadRequestError('Too many OTP attempts! Please try again later.');
  }

  const isValidOTP = hashTokenSHA256(otp) === passwordResetRequest.otpHash;

  if (!isValidOTP) {
    await prisma.passwordReset.update({
      where: { id: passwordResetRequest.id },
      data: {
        otpAttempts: passwordResetRequest.otpAttempts + 1,
      },
    });

    const attemptsRemaining =
      AUTH_CONFIG.MAX_OTP_ATTEMPTS - (passwordResetRequest.otpAttempts + 1);

    if (attemptsRemaining <= 0) {
      throw new BadRequestError(
        'Too many OTP attempts! Please try again later.'
      );
    }
    throw new BadRequestError(
      `Invalid OTP. ${attemptsRemaining} attempts remaining.`
    );
  }

  // Pre-validate password reuse prior to transaction and OTP invalidation
  await canUsePassword(user.id, newPassword);

  const newPasswordHash = await hashPassword(newPassword);

  // Atomically mark OTP used, update password, record history, and revoke sessions
  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.passwordReset.updateMany({
      where: { id: passwordResetRequest.id, otpUsed: false },
      data: {
        otpUsed: true,
        otpUsedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new BadRequestError('OTP has already been used or expired!');
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash: newPasswordHash,
        changedAt: new Date(),
      },
    });

    const oldHistory = await tx.passwordHistory.findMany({
      where: { userId: user.id },
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

    await tx.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Password reset',
      },
    });
  });

  import('@aegis/events')
    .then(({ enqueueNotification, NotificationEvent }) => {
      enqueueNotification(NotificationEvent.PASSWORD_RESET_COMPLETED, {
        userId: user.id,
        email: user.email,
        username: user.username,
      });
    })
    .catch((err) =>
      logger.error('Failed to enqueue password reset confirmation email', err)
    );

  logger.info({
    message: 'Password reset successful',
    userId: user.id,
    email: user.email,
  });
};

/**
 * Resets user password using a verified reset token within an atomic transaction.
 * @param resetId - Password reset record identifier
 * @param token - Reset token string
 * @param newPassword - New plaintext password
 */
export const resetPasswordWithToken = async (
  resetId: string,
  token: string,
  newPassword: string
): Promise<void> => {
  const passwordResetRequest = await prisma.passwordReset.findFirst({
    where: {
      id: resetId,
      tokenExpiresAt: { gt: new Date() },
      tokenUsed: false,
      otpUsed: false,
    },
    include: {
      user: true,
    },
  });

  if (!passwordResetRequest) {
    throw new UnauthorizedError('Invalid or expired reset link!');
  }

  const isValidToken =
    hashTokenSHA256(token) === passwordResetRequest.tokenHash;

  if (!isValidToken) {
    throw new UnauthorizedError('Invalid or expired reset link!');
  }

  const isPasswordValid = await validatePassword(newPassword);
  if (isPasswordValid.success === false && isPasswordValid.error) {
    throw new BadRequestError(isPasswordValid.error || 'Invalid password!');
  }

  await canUsePassword(passwordResetRequest.userId, newPassword);

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.passwordReset.updateMany({
      where: { id: passwordResetRequest.id, tokenUsed: false },
      data: {
        tokenUsed: true,
        tokenUsedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      throw new UnauthorizedError('Reset link has already been used!');
    }

    await tx.user.update({
      where: { id: passwordResetRequest.userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.passwordHistory.create({
      data: {
        userId: passwordResetRequest.userId,
        passwordHash: newPasswordHash,
        changedAt: new Date(),
      },
    });

    const oldHistory = await tx.passwordHistory.findMany({
      where: { userId: passwordResetRequest.userId },
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

    await tx.session.updateMany({
      where: { userId: passwordResetRequest.userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Password reset',
      },
    });
  });

  import('@aegis/events')
    .then(({ enqueueNotification, NotificationEvent }) => {
      enqueueNotification(NotificationEvent.PASSWORD_RESET_COMPLETED, {
        userId: passwordResetRequest.userId,
        email: passwordResetRequest.user.email,
        username: passwordResetRequest.user.username,
      });
    })
    .catch((err) =>
      logger.error('Failed to enqueue password reset confirmation email', err)
    );

  logger.info({
    message: 'Password reset successful',
    userId: passwordResetRequest.userId,
    email: passwordResetRequest.user.email,
    resetId: resetId,
  });
};
