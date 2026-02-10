import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const createRedisClient = () => {
  const host = process.env.REDIS_HOST;
  const password = process.env.REDIS_PASSWORD;
  const port = process.env.REDIS_PORT;

  if (!host || !port || !password) {
    throw new Error(
      'REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD environment variables must be set'
    );
  }

  const redis = new Redis({
    host,
    password,
    port: Number(port),
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    reconnectOnError: (error) => {
      logger.error(error, 'Redis client error:');
      return true;
    },
  });

  redis.on('connect', () => {
    logger.info('Redis client connected!');
  });

  redis.on('ready', () => {
    logger.info('Redis client ready to accept commands');
  });

  redis.on('error', (error) => {
    logger.error(error, 'Redis client error:');
  });

  return redis;
};

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

export const disconnectRedis = async () => {
  await redis.quit();
};
