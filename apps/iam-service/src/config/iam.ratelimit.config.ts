/**
 * Service-level rate limiting windows, thresholds, and Redis prefixes for IAM endpoints.
 */
export const IAM_RATE_LIMIT_CONFIG = {
  REFRESH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5,
    REDIS_PREFIX: 'aegis:iam:rl:refresh:',
  },
  LOGIN: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 10,
    REDIS_PREFIX: 'aegis:iam:rl:login:',
  },
  REGISTER: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 5,
    REDIS_PREFIX: 'aegis:iam:rl:register:',
  },
  FORGOT_PASSWORD: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 3,
    REDIS_PREFIX: 'aegis:iam:rl:forgot-password:',
  },
  RESET_PASSWORD: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5,
    REDIS_PREFIX: 'aegis:iam:rl:reset-password:',
  },
} as const;
