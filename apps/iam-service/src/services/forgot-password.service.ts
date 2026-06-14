import {
  AUTH_CONFIG,
  hashPassword,
  logger,
  validatePassword,
  verifyPassword,
} from '@aegis/common';
import { prisma } from '@aegis/database';
import { BadRequestError, UnauthorizedError } from '@aegis/middlewares';
import { randomBytes, randomInt } from 'crypto';

// Generate 6-digit OTP using CSPRNG
const generateOTP = (): string => {
  return randomInt(100000, 999999).toString();
};

// Request password reset OTP
export const requestPasswordReset = async (email: string): Promise<void> => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, username: true },
  });

  if (!user) {
    // Silent success even if user does not exist
    logger.info({
      message: 'Password reset requested for non-existent user',
      email,
    });
    return;
  }

  // Generate OTP and token
  const otp = generateOTP();
  const token = randomBytes(32).toString('hex');
  const otpHash = await hashPassword(otp); // Hash the otp
  const tokenHash = await hashPassword(token); // Hash the token

  const otpExpiry = new Date(
    Date.now() + AUTH_CONFIG.OTP_EXPIRY_MINUTES * 60 * 1000
  ); // 10 Minutes
  const tokenExpiry = new Date(
    Date.now() + AUTH_CONFIG.TOKEN_EXPIRY_MINUTES * 60 * 1000
  ); // 25 Minutes

  // Delete any existing password reset requests for this user
  await prisma.passwordReset.deleteMany({
    where: { userId: user.id },
  });

  // Create new password reset request
  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash,
      otpHash: otpHash,
      tokenExpiresAt: tokenExpiry,
      otpExpiresAt: otpExpiry,
      otpAttempts: 0,
      otpUsed: false,
      tokenUsed: false, // Password not reset using token
    },
  });

  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    enqueueNotification(NotificationEvent.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      email: user.email,
      username: user.username,
      otp: otp,
      resetToken: token,
      expiresAt: otpExpiry,
    });
  }).catch(err => logger.error('Failed to enqueue password reset email', err));

  // For dev, log the OTP
  logger.info({
    message: 'Password reset OTP sent',
    userId: user.id,
    otp: '[REDACTED]',
    otpExpiresAt: otpExpiry,
  });
};

// Verify OTP and reset password
export const resetPasswordWithOTP = async (
  email: string,
  otp: string,
  newPassword: string
): Promise<void> => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new BadRequestError('Invalid credentials!');
  }

  // Validate the password against password policy
  const isPasswordValid = await validatePassword(newPassword);
  if (isPasswordValid.success === false && isPasswordValid.error) {
    throw new BadRequestError(isPasswordValid.error || 'Invalid password!');
  }

  // Find active password reset request
  const passwordResetRequest = await prisma.passwordReset.findFirst({
    where: {
      userId: user.id,
      otpExpiresAt: { gt: new Date() },
      otpUsed: false,
      tokenUsed: false, // Password not reset using token
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!passwordResetRequest) {
    throw new BadRequestError(
      'No active password reset request found. Please request a new one!'
    );
  }

  // Check OTP attempts
  if (passwordResetRequest.otpAttempts >= AUTH_CONFIG.MAX_OTP_ATTEMPTS) {
    throw new BadRequestError('Too many OTP attempts! Please try again later.');
  }

  // Verify OTP
  const isValidOTP = await verifyPassword(otp, passwordResetRequest.otpHash);

  if (!isValidOTP) {
    // Increment the attempts
    await prisma.passwordReset.update({
      where: { id: passwordResetRequest.id },
      data: {
        otpAttempts: passwordResetRequest.otpAttempts + 1,
      },
    });

    const attemptsRemaining =
      AUTH_CONFIG.MAX_OTP_ATTEMPTS - (passwordResetRequest.otpAttempts + 1);

    if (attemptsRemaining === 0) {
      throw new BadRequestError(
        'Too many OTP attempts! Please try again later.'
      );
    }
    throw new BadRequestError(
      `Invalid OTP. ${attemptsRemaining} attempts remaining.`
    );
  }

  // Atomically mark OTP as used immediately to prevent TOCTOU race conditions
  const updateResult = await prisma.passwordReset.updateMany({
    where: { id: passwordResetRequest.id, otpUsed: false },
    data: {
      otpUsed: true,
      otpUsedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    throw new BadRequestError('OTP has already been used or expired!');
  }

  // Import password history service
  const { canUsePassword, validateAndStorePassword } = await import(
    './password-history.service.js'
  );

  // Check password history
  await canUsePassword(user.id, newPassword);

  // Update password in password history
  await validateAndStorePassword(user.id, newPassword);

  // OTP is already marked as used above

  // Revoke all session - force re-login
  await prisma.session.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokedReason: 'Password reset',
    },
  });

  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    enqueueNotification(NotificationEvent.PASSWORD_RESET_COMPLETED, {
      userId: user.id,
      email: user.email,
      username: user.email, // using email as fallback if username isn't queried
    });
  }).catch(err => logger.error('Failed to enqueue password reset confirmation email', err));

  logger.info({
    message: 'Password reset successful',
    userId: user.id,
    email: user.email,
  });
};

// Reset password with token
export const resetPasswordWithToken = async (
  resetId: string,
  token: string,
  newPassword: string
): Promise<void> => {
  // Find password reset request by token
  const passwordResetRequest = await prisma.passwordReset.findFirst({
    where: {
      id: resetId,
      tokenExpiresAt: { gt: new Date() },
      tokenUsed: false,
      otpUsed: false, // Password not reset using OTP
    },
    include: {
      user: true, // Include user data
    },
  });

  if (!passwordResetRequest) {
    throw new UnauthorizedError('Invalid or expired reset link!');
  }

  // Verify token
  const isValidToken = await verifyPassword(
    token,
    passwordResetRequest.tokenHash
  );

  if (!isValidToken) {
    throw new UnauthorizedError('Invalid or expired reset link!');
  }

  // Atomically mark token as used immediately to prevent TOCTOU
  const updateResult = await prisma.passwordReset.updateMany({
    where: { id: passwordResetRequest.id, tokenUsed: false },
    data: {
      tokenUsed: true,
      tokenUsedAt: new Date(),
    },
  });

  if (updateResult.count === 0) {
    throw new UnauthorizedError('Reset link has already been used!');
  }

  // Validate the password against password policy
  const isPasswordValid = await validatePassword(newPassword);
  if (isPasswordValid.success === false && isPasswordValid.error) {
    throw new BadRequestError(isPasswordValid.error || 'Invalid password!');
  }

  const { canUsePassword, validateAndStorePassword } = await import(
    './password-history.service.js'
  );

  // Check password history
  await canUsePassword(passwordResetRequest.userId, newPassword);

  // Update password in password history
  await validateAndStorePassword(passwordResetRequest.userId, newPassword);

  // Token is already marked as used above

  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    enqueueNotification(NotificationEvent.PASSWORD_RESET_COMPLETED, {
      userId: passwordResetRequest.userId,
      email: passwordResetRequest.user.email,
      username: passwordResetRequest.user.username,
    });
  }).catch(err => logger.error('Failed to enqueue password reset confirmation email', err));
  await prisma.session.updateMany({
    where: { userId: passwordResetRequest.userId, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokedReason: 'Password reset',
    },
  });

  logger.info({
    message: 'Password reset successful',
    userId: passwordResetRequest.userId,
    email: passwordResetRequest.user.email,
    resetId: resetId,
    token: token,
  });
};
