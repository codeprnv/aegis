export const AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    REGISTER_WINDOW_MS: 60 * 60 * 1000, // 1 hour
    LOGIN_WINDOW_MS: 15 * 60 * 1000,
    FORGOT_PASSWORD_WINDOW_MS: 60 * 60 * 1000, // 1hour
    RESET_PASSWORD_WINDOW_MS: 15 * 60 * 1000,
    REFRESH_WINDOW_MS: 15 * 60 * 1000,
    MAX_REQUESTS: 50,
    AUTH_MAX_REQUESTS: 5,
    MAX_REGISTER_REQUESTS: 5,
    MAX_LOGIN_REQUESTS: 10,
    MAX_FORGOT_PASSWORD_REQUESTS: 3,
    MAX_RESET_PASSWORD_REQUESTS: 5,
    MAX_REFRESH_REQUESTS: 5,
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
  FAILED_ATTEMPTS: (email: string) => `aegis:iam:lockout:attempts:${email}`,
  ACCOUNT_LOCKOUT: (email: string) => `aegis:iam:lockout:locked:${email}`,
  SESSION: (sessionId: string) => `aegis:iam:session:${sessionId}`,
} as const;
