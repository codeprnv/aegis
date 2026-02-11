import { AUTH_CONFIG } from '@aegis/common';
import rateLimit from 'express-rate-limit';

export const refreshRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.WINDOW_MS,
  limit: AUTH_CONFIG.RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many refresh attempts, please try again later.',
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.WINDOW_MS,
  limit: AUTH_CONFIG.RATE_LIMIT.AUTH_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many login attempts, please try again later.',
  },
});

/* TODO: Add rate limiter for routes in auth routes */
