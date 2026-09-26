import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import RedisClient from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import { GATEWAY_RATE_LIMIT_CONFIG } from '../config/gateway.ratelimit.config.js';

const redisClient = new RedisClient(
  process.env.REDIS_URL || 'redis://localhost:6379'
);

/**
 * Extracts and sanitizes the untampered client IP address from proxy headers or socket.
 * Inspects X-Forwarded-For (first entry) and X-Real-IP before falling back to req.ip.
 *
 * @param req - Incoming Express request
 * @returns Sanitized client IP address string
 */
export function extractClientIp(req: Request): string {
  if (req.clientIp) {
    return req.clientIp;
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

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
    const clientIp = extractClientIp(req);
    const userId = (req as any).user?.sub;
    return userId
      ? `user:${userId}:${ipKeyGenerator(clientIp)}`
      : `ip:${ipKeyGenerator(clientIp)}`;
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
    const clientIp = extractClientIp(req);
    return `ip:${ipKeyGenerator(clientIp)}`;
  },
});

export const auditRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) =>
      redisClient.call(args[0], ...args.slice(1)) as any,
    prefix: GATEWAY_RATE_LIMIT_CONFIG.AUDIT.REDIS_PREFIX,
  }),
  windowMs: GATEWAY_RATE_LIMIT_CONFIG.AUDIT.WINDOW_MS,
  max: GATEWAY_RATE_LIMIT_CONFIG.AUDIT.MAX_REQUESTS,
  message: GATEWAY_RATE_LIMIT_CONFIG.AUDIT.MESSAGE,
  legacyHeaders: true,
  keyGenerator: (req) => {
    const clientIp = extractClientIp(req);
    const userId = (req as any).user?.sub;
    return userId
      ? `user:${userId}:${ipKeyGenerator(clientIp)}`
      : `ip:${ipKeyGenerator(clientIp)}`;
  },
});

/**
 * Dedicated health probe rate limiter to protect infrastructure endpoints
 * from socket exhaustion floods while allowing orchestrator and monitor pings.
 * Allows up to 60 requests/minute per IP (Render only uses 6 req/min).
 */
export const probeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    status: 'error',
    message: 'Too many probe requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const clientIp = extractClientIp(req);
    return `probe:${ipKeyGenerator(clientIp)}`;
  },
});
