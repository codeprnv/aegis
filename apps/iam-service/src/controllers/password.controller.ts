import { BadRequestError } from '@aegis/middlewares';
import type { NextFunction, Request, Response } from 'express';
import * as adminResetService from '../services/admin-reset-password.service';
import * as changePasswordService from '../services/change-password.service';
import * as forgotPasswordService from '../services/forgot-password.service';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resetPasswordTokenSchema,
} from '../types/password.types';

/*
 * POST /auth/forgot-password
 * Request password reset OTP (unauthenticated)
 */

export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = forgotPasswordSchema.parse(req.body);

    await forgotPasswordService.requestPasswordReset(validatedData.email);

    res.status(200).json({
      success: true,
      message:
        'If an account exists with that email, you will receive a password reset OTP',
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /auth/reset-password
 * Reset password with OTP (unauthenticated)
 */

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);

    await forgotPasswordService.resetPasswordWithOTP(
      validatedData.email,
      validatedData.otp,
      validatedData.newPassword
    );

    res.status(200).json({
      success: true,
      message: `Password reset successfully. Please log in with your new password`,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /auth/reset-password-token
 * Reset password with token (unauthenticated)
 */

export const resetPasswordTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = resetPasswordTokenSchema.parse(req.body);

    await forgotPasswordService.resetPasswordWithToken(
      validatedData.resetId,
      validatedData.token,
      validatedData.newPassword
    );

    res.status(200).json({
      success: true,
      message: `Password reset successfully. Please log in with your new password`,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /auth/change-password
 * Change password (authenticated)
 */

export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      throw new BadRequestError('User not authenticated');
    }
    const validatedData = changePasswordSchema.parse(req.body);
    const sessionId = req.headers['x-session-id'] as string | undefined;

    const { revokedSessions } = await changePasswordService.changePassword(
      userId,
      validatedData.currentPassword,
      validatedData.newPassword,
      sessionId
    );

    res.status(200).json({
      success: true,
      message: `Password changed successfully. ${revokedSessions} other sessions have been logged out`,
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /admin/users/:userId/reset-password
 * Reset password for a user (admin-only)
 */

export const adminResetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminUserId = req.user?.sub;
    if (!adminUserId) {
      throw new BadRequestError('Admin not authenticated');
    }
    const { userId } = req.params;
    if (!userId) {
      throw new BadRequestError('User ID is required');
    }

    await adminResetService.adminResetPassword(adminUserId, userId);

    //   TODO: Send email with temporary password

    res.status(200).json({
      success: true,
      message: `User password reset successfully. Temporary password sent to user's email`,
    });
  } catch (error) {
    next(error);
  }
};
