import { BadRequestError } from '@aegis/common';
import type { NextFunction, Request, Response } from 'express';
import * as authService from '../services/auth.service';

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
    const { username, email, password, mobile } = req.body;

    // Input validation (controller's responsibility)
    if (!username || !email || !password) {
      throw new BadRequestError(
        'Missing required fields: username, email, and password are required'
      );
    }

    if (typeof username !== 'string' || username.length < 3) {
      throw new BadRequestError('Username must be at least 3 characters');
    }

    if (typeof password !== 'string' || password.length < 8) {
      throw new BadRequestError('Password must be at least 8 characters');
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError('Invalid email format');
    }

    // Call service layer for business logic
    const user = await authService.registerUser({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      mobile: mobile?.trim(),
    });

    // Return response (controller's responsibility)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
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
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      throw new BadRequestError('Email and password are required!');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestError('Invalid email format');
    }

    const user = await authService.loginUser({
      email: email.toLowerCase().trim(),
      password,
    });

    res.cookie('access_token', user.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', user.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
