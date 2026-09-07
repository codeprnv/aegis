import { AUTH_CONFIG } from '@aegis/common';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import RedisClient from 'ioredis';

const redisClient = new RedisClient(process.env.REDIS_URL || 'redis://localhost:6379');

export const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'aegis:gateway:rl:',
  }),
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
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'aegis:gateway:rl:auth:',
  }),
  windowMs: 60 * 1000,
  max: 50,
  message: {
    status: 'error',
    statusCode: 429,
    message: 'Too many requests to authentication endpoints. Please try again later.',
  },
  legacyHeaders: true,
  keyGenerator: (req) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return ipKeyGenerator(ip);
  },
});
