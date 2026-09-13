/**
 * Account lockout policy thresholds, duration constants, and Redis key generators.
 */
export const IAM_LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_SECONDS: 15 * 60, // 15 minutes
  ATTEMPT_WINDOW_SECONDS: 60 * 60, // 1 hour
  SENTINEL_LOCKED_VALUE: 'locked',
} as const;

export const REDIS_LOCKOUT_KEYS = {
  FAILED_ATTEMPTS: (email: string): string =>
    `aegis:iam:lockout:attempts:${email}`,
  ACCOUNT_LOCKOUT: (email: string): string =>
    `aegis:iam:lockout:locked:${email}`,
} as const;
