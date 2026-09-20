import { SERVICE_NAMES } from '@aegis/common';

/**
 * Route path constants for API Gateway probes and public versions.
 */
export const GATEWAY_ROUTES = {
  HEALTH: '/gateway-health',
  READY: '/ready',
  LIVE: '/live',
  V1_PREFIX: '/v1',
  AUTH: '/auth',
  ADMIN: '/admin',
  AUDIT: '/audit',
  UPSTREAM_IAM_AUTH_PREFIX: '/internal/v1/auth',
  UPSTREAM_IAM_ADMIN_PREFIX: '/internal/v1/admin',
  UPSTREAM_AUDIT_PREFIX: '/internal/v1/audit',
} as const;

/**
 * Proxy and circuit breaker settings for downstream microservices.
 */
export const GATEWAY_PROXY_CONFIG = {
  IAM_SERVICE: {
    name: SERVICE_NAMES.IAM,
    timeoutMs: 8000,
    circuitBreaker: {
      enabled: true,
      resetTimeout: 20000,
      errorThreshold: 75,
    },
  },
  AUDIT_SERVICE: {
    name: SERVICE_NAMES.AUDIT,
    timeoutMs: 8000,
    circuitBreaker: {
      enabled: true,
      resetTimeout: 20000,
      errorThreshold: 75,
    },
  },
} as const;
