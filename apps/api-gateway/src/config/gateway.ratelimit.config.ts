/**
 * Edge rate limiting policies and Redis store configurations for API Gateway.
 */
export const GATEWAY_RATE_LIMIT_CONFIG = {
  GLOBAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 50,
    REDIS_PREFIX: 'aegis:gateway:rl:',
    MESSAGE: {
      status: 'error',
      statusCode: 429,
      message:
        'Too many requests from this IP, please try again after 15 minutes',
    },
  },
  AUTH: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 50,
    REDIS_PREFIX: 'aegis:gateway:rl:auth:',
    MESSAGE: {
      status: 'error',
      statusCode: 429,
      message:
        'Too many requests to authentication endpoints. Please try again later.',
    },
  },
  AUDIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 60,
    REDIS_PREFIX: 'aegis:gateway:rl:audit:',
    MESSAGE: {
      status: 'error',
      statusCode: 429,
      message:
        'Too many requests to audit logs. Please try again later.',
    },
  },
  AUTH_ROUTE_REGEX:
    /^\/auth\/(login|register|reset-password|forgot-password)\/?$/i,
} as const;
