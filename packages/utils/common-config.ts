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

  // Password History
  PASSWORD_HISTORY_LIMIT: 5, //Prevent reuse of last 5 passwords,

  // Password Reset
  OTP_EXPIRY_MINUTES: 10,
  TOKEN_EXPIRY_MINUTES: 25,
  MAX_OTP_ATTEMPTS: 3,

  MAX_TRANSACTION_WAIT: 5 * 1000, // 5 seconds
  TRANSACTION_TIMEOUT: 10 * 1000, // 10 seconds
} as const;

export const REDIS_KEYS = {
  FAILED_ATTEMPTS: (email: string) => `auth:attempts:${email}`,
  ACCOUNT_LOCKOUT: (email: string) => `auth:lockout:${email}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
} as const;
