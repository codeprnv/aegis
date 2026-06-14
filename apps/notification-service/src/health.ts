import { logger } from '@aegis/common';
import { createBullMQConnection } from '@aegis/events';
import Redis from 'ioredis';

export const checkHealth = async () => {
  const status = {
    healthy: true,
    redis: 'disconnected',
    database: 'disconnected',
    timestamp: new Date().toISOString(),
  };

  let redis: Redis | null = null;

  try {
    // Check if we can reach Upstash via TCP
    redis = createBullMQConnection();
    const ping = await redis.ping();
    if (ping === 'PONG') {
      status.redis = 'connected';
    } else {
      status.healthy = false;
    }

    // Check Postgres Database Connection
    const { prisma } = require('@aegis/database');
    await prisma.$queryRaw`SELECT 1`;
    status.database = 'connected';

  } catch (error: any) {
    logger.error(`Health check failed: ${error.message}`);
    status.healthy = false;
    if (status.redis !== 'connected') status.redis = 'error';
    if (status.database !== 'connected') status.database = 'error';
  } finally {
    if (redis) {
      redis.disconnect();
    }
  }

  return status;
};
