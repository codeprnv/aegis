import { AUTH_CONFIG } from '@aegis/common';
import rateLimit from 'express-rate-limit';

export const refreshRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.REFRESH_WINDOW_MS, // 15 minutes
  limit: AUTH_CONFIG.RATE_LIMIT.MAX_REFRESH_REQUESTS, // 5 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many refresh attempts, please try again later.',
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.LOGIN_WINDOW_MS, // 15 minutes
  limit: AUTH_CONFIG.RATE_LIMIT.MAX_LOGIN_REQUESTS, // 10 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many login attempts, please try again later.',
  },
});

export const registerRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.REGISTER_WINDOW_MS, // 1 hour
  limit: AUTH_CONFIG.RATE_LIMIT.MAX_REGISTER_REQUESTS, // 5 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many accounts created. Please try again later.',
  },
});

export const forgotPasswordRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.FORGOT_PASSWORD_WINDOW_MS, // 1 hour
  limit: AUTH_CONFIG.RATE_LIMIT.MAX_FORGOT_PASSWORD_REQUESTS, // 3 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many password reset requests. Please try again later',
  },
});

export const resetPasswordRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.RESET_PASSWORD_WINDOW_MS, // 15 minutes
  limit: AUTH_CONFIG.RATE_LIMIT.MAX_RESET_PASSWORD_REQUESTS, // 5 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many reset attempts. Please try again later.',
  },
});
