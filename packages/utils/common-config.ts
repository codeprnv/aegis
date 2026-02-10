export const AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 50,
    AUTH_MAX_REQUESTS: 5,
  },

  // Account lockout
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_SECONDS: 15 * 60,
  ATTEMPT_WINDOW_SECONDS: 60 * 60,
} as const;

export const REDIS_KEYS = {
  FAILED_ATTEMPTS: (email: string) => `auth:attempts:${email}`,
  ACCOUNT_LOCKOUT: (email: string) => `auth:lockout:${email}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
} as const;
