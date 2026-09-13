/**
 * User registration staging durations and Redis key generators.
 */
export const IAM_REGISTRATION_CONFIG = {
  STAGING_TTL_SECONDS: 86400, // 24 hours
  TOKEN_BYTE_LENGTH: 32,
} as const;

export const REDIS_REGISTRATION_KEYS = {
  PENDING_PAYLOAD: (tokenHash: string): string => `registration:${tokenHash}`,
  PENDING_EMAIL: (email: string): string => `registration:email:${email}`,
  PENDING_USERNAME: (username: string): string =>
    `registration:username:${username}`,
} as const;
