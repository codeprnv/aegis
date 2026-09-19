import { logger } from '@aegis/common';
import { auditPrisma, redis } from '@aegis/database';

export interface HealthCheckStatus {
  healthy: boolean;
  service: string;
  redis: 'connected' | 'disconnected' | 'error';
  database: 'connected' | 'disconnected' | 'error';
  timestamp: string;
}

/**
 * Checks connectivity to the upstream database and Redis instances.
 * Reuses active singleton connections to avoid TCP socket churn.
 *
 * @returns Comprehensive health status object
 */
export const checkHealth = async (): Promise<HealthCheckStatus> => {
  const status: HealthCheckStatus = {
    healthy: true,
    service: 'audit-service',
    redis: 'disconnected',
    database: 'disconnected',
    timestamp: new Date().toISOString(),
  };

  try {
    // Check Redis connectivity via shared instance
    const ping = await redis.ping();
    if (ping === 'PONG') {
      status.redis = 'connected';
    } else {
      status.healthy = false;
    }

    // Check Postgres Audit schema connectivity
    await auditPrisma.$queryRaw`SELECT 1`;
    status.database = 'connected';
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errorMsg }, 'Audit service health check failed');
    status.healthy = false;
    if (status.redis !== 'connected') status.redis = 'error';
    if (status.database !== 'connected') status.database = 'error';
  }

  return status;
};
