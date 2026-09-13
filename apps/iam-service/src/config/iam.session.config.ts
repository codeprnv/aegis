/**
 * Session lifecycle durations, grace periods, retention limits, and Redis session key templates.
 */
export const IAM_SESSION_CONFIG = {
  ABSOLUTE_SESSION_MAX_AGE_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
  REFRESH_GRACE_PERIOD_SECONDS: 15,
  LAST_ACTIVE_DEBOUNCE_MS: 5 * 60 * 1000, // 5 minutes
  SESSION_CLEANUP_CRON: '0 2 * * *',
  RETENTION_WINDOWS: {
    EXPIRED_SESSIONS_MS: 30 * 24 * 60 * 60 * 1000, // 30 days
    COMPLETED_RESETS_MS: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

export const REDIS_SESSION_KEYS = {
  SESSION: (sessionId: string): string => `aegis:iam:session:${sessionId}`,
  REFRESH_CACHE: (oldTokenHash: string): string =>
    `aegis:refresh:cache:${oldTokenHash}`,
} as const;
