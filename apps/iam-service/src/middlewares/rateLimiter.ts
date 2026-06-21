import { AUTH_CONFIG } from '@aegis/common';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import RedisClient from 'ioredis';

const redisClient = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

export const refreshRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'aegis:iam:rl:refresh:',
  }),
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
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'aegis:iam:rl:login:',
  }),
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
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'aegis:iam:rl:register:',
  }),
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
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'aegis:iam:rl:forgot-password:',
  }),
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
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'aegis:iam:rl:reset-password:',
  }),
  windowMs: AUTH_CONFIG.RATE_LIMIT.RESET_PASSWORD_WINDOW_MS, // 15 minutes
  limit: AUTH_CONFIG.RATE_LIMIT.MAX_RESET_PASSWORD_REQUESTS, // 5 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many reset attempts. Please try again later.',
  },
});
