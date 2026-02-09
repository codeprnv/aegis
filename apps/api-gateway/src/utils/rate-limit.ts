import { AUTH_CONFIG } from '@aegis/common';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.WINDOW_MS,
  max: AUTH_CONFIG.RATE_LIMIT.MAX_REQUESTS,
  message: {
    status: 'error',
    statusCode: 429,
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
  legacyHeaders: true,
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return ipKeyGenerator(ip);
  },
});

export const authRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.RATE_LIMIT.WINDOW_MS, // 15 min
  max: AUTH_CONFIG.RATE_LIMIT.AUTH_MAX_REQUESTS, // 5 requests
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many login attempts, please try again later!',
  },
  legacyHeaders: true,
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return ipKeyGenerator(ip);
  },
});
