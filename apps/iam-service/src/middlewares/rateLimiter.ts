import { IAM_RATE_LIMIT_CONFIG } from '../config/index.js';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import RedisClient from 'ioredis';

const redisClient = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Rate limiter middleware for token refresh requests.
 */
export const refreshRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: IAM_RATE_LIMIT_CONFIG.REFRESH.REDIS_PREFIX,
  }),
  windowMs: IAM_RATE_LIMIT_CONFIG.REFRESH.WINDOW_MS,
  limit: IAM_RATE_LIMIT_CONFIG.REFRESH.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many refresh attempts, please try again later.',
  },
});

/**
 * Rate limiter middleware for user authentication requests.
 */
export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: IAM_RATE_LIMIT_CONFIG.LOGIN.REDIS_PREFIX,
  }),
  windowMs: IAM_RATE_LIMIT_CONFIG.LOGIN.WINDOW_MS,
  limit: IAM_RATE_LIMIT_CONFIG.LOGIN.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many login attempts, please try again later.',
  },
});

/**
 * Rate limiter middleware for user registration requests.
 */
export const registerRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: IAM_RATE_LIMIT_CONFIG.REGISTER.REDIS_PREFIX,
  }),
  windowMs: IAM_RATE_LIMIT_CONFIG.REGISTER.WINDOW_MS,
  limit: IAM_RATE_LIMIT_CONFIG.REGISTER.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many accounts created. Please try again later.',
  },
});

/**
 * Rate limiter middleware for password reset requests, keyed by normalized target email with IP fallback.
 */
export const forgotPasswordRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: IAM_RATE_LIMIT_CONFIG.FORGOT_PASSWORD.REDIS_PREFIX,
  }),
  windowMs: IAM_RATE_LIMIT_CONFIG.FORGOT_PASSWORD.WINDOW_MS,
  limit: IAM_RATE_LIMIT_CONFIG.FORGOT_PASSWORD.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many password reset requests. Please try again later',
  },
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    if (email) {
      return `email:${email}`;
    }
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return `ip:${ipKeyGenerator(ip)}`;
  },
});

/**
 * Rate limiter middleware for password reset execution, keyed by target identifier with IP fallback.
 */
export const resetPasswordRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: IAM_RATE_LIMIT_CONFIG.RESET_PASSWORD.REDIS_PREFIX,
  }),
  windowMs: IAM_RATE_LIMIT_CONFIG.RESET_PASSWORD.WINDOW_MS,
  limit: IAM_RATE_LIMIT_CONFIG.RESET_PASSWORD.MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many reset attempts. Please try again later.',
  },
  keyGenerator: (req) => {
    const identifier = req.body?.email || req.body?.resetId;
    if (typeof identifier === 'string' && identifier.trim()) {
      return `target:${identifier.toLowerCase().trim()}`;
    }
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return `ip:${ipKeyGenerator(ip)}`;
  },
});
