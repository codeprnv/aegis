import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import RedisClient from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import { GATEWAY_RATE_LIMIT_CONFIG } from '../config/gateway.ratelimit.config.js';

const redisClient = new RedisClient(
  process.env.REDIS_URL || 'redis://localhost:6379'
);

export const rateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
    prefix: GATEWAY_RATE_LIMIT_CONFIG.GLOBAL.REDIS_PREFIX,
  }),
  windowMs: GATEWAY_RATE_LIMIT_CONFIG.GLOBAL.WINDOW_MS,
  max: GATEWAY_RATE_LIMIT_CONFIG.GLOBAL.MAX_REQUESTS,
  message: GATEWAY_RATE_LIMIT_CONFIG.GLOBAL.MESSAGE,
  legacyHeaders: true,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    return `ip:${ipKeyGenerator(ip)}`;
  },
});

export const authRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
    prefix: GATEWAY_RATE_LIMIT_CONFIG.AUTH.REDIS_PREFIX,
  }),
  windowMs: GATEWAY_RATE_LIMIT_CONFIG.AUTH.WINDOW_MS,
  max: GATEWAY_RATE_LIMIT_CONFIG.AUTH.MAX_REQUESTS,
  message: GATEWAY_RATE_LIMIT_CONFIG.AUTH.MESSAGE,
  legacyHeaders: true,
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    return `ip:${ipKeyGenerator(ip)}`;
  },
});
