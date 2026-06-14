import { Redis } from '@upstash/redis';
import { logger } from '../utils/logger.js';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const createRedisClient = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:8080';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy-token';

  if (!process.env.UPSTASH_REDIS_REST_URL && process.env.NODE_ENV !== 'test') {
    logger.warn('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are missing');
  }

  const redis = new Redis({
    url,
    token,
  });

  logger.info('Upstash Redis client initialized');

  return redis;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export const disconnectRedis = async () => {
  // @upstash/redis uses HTTP, so there's no persistent TCP connection to close.
  // We keep this function for backwards compatibility with the existing interface.
  logger.info('disconnectRedis called (noop for Upstash)');
};
