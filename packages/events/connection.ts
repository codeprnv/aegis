import { Redis } from 'ioredis';

/**
 * Creates an isolated Redis connection instance for BullMQ queues and workers.
 * Configured with lazy connection, no offline queue, and unhandled rejection guards to prevent Upstash connection starvation against Gateway rate limiters
 * */

export const createBullMQConnection = (): Redis => {
  const redisUrl =
    process.env.UPSTASH_REDIS_URL ||
    process.env.REDIS_URL ||
    'redis://127.0.0.1:6379';
  const isTLS = redisUrl.startsWith('rediss://');

  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
    ...(isTLS ? { tls: {} } : {}),
  });

  client.on('error', (err) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error('[BullMQ Redis connection error]: ', err.message);
    }
  });

  return client;
};
