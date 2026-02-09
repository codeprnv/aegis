import {
  AUTH_CONFIG,
  BadRequestError,
  clearCookie,
  setCookie,
  validatePassword,
} from '@aegis/common';
import type { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service';
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../types/auth.types';

/**
 * POST /register
 * Register a new user account
 */
export const registerUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Input validation
    const validatedData = registerSchema.parse(req.body);

    // Call service layer for business logic
    const data = await authService.registerUser({
      username: validatedData.username.trim(),
      email: validatedData.email.toLowerCase().trim(),
      password: validatedData.password,
      mobile: validatedData.mobile?.trim(),
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    setCookie('access_token', data.accessToken || '', res);
    setCookie('refresh_token', data.refreshToken || '', res, {
      maxAge: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    // Return response (controller's responsibility)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: data.id,
        username: data.username,
        email: data.email,
        mobile: data.mobile,
        role: data.role,
        createdAt: data.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /login
 * Login a user
 */

export const loginUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = loginSchema.parse(req.body);

    const data = await authService.loginUser({
      email: validatedData.email.toLowerCase().trim(),
      password: validatedData.password,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    setCookie('access_token', data.accessToken || '', res);
    setCookie('refresh_token', data.refreshToken || '', res, {
      maxAge: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      data: {
        id: data.id,
        username: data.username,
        email: data.email,
        mobile: data.mobile,
        role: data.role,
        createdAt: data.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /refresh
 * Refresh access token using refresh token cookie
 */
export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies['refresh_token'];

    if (!refreshToken) {
      throw new BadRequestError('Refresh token required');
    }

    const data = await authService.refreshTokenService(refreshToken);

    setCookie('access_token', data.accessToken || '', res);
    setCookie('refresh_token', data.refreshToken || '', res, {
      maxAge: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /logout
 * Logout the user
 */

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user.sub;

    if (!userId) {
      throw new BadRequestError('User ID is required!');
    }

    await authService.logoutService(userId);

    clearCookie('access_token', res);
    clearCookie('refresh_token', res);

    res.status(200).json({
      success: true,
      message: 'User logged out successfully!',
    });
  } catch (error) {
    next(error);
  }
};

/*
 * POST /reset-password
 * Reset user password
 */

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validatedData = resetPasswordSchema.parse(req.body);

    const data = await authService.resetPasswordService(validatedData);

    res.status(200).json({
      ...data,
    });
  } catch (error) {
    next(error);
  }
};
