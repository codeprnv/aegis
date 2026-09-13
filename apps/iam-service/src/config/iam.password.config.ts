/**
 * Password policy thresholds, history retention limits, OTP expiration, and admin generation constants.
 */
export const IAM_PASSWORD_CONFIG = {
  PASSWORD_HISTORY_LIMIT: 5,
  OTP: {
    LENGTH: 6,
    EXPIRY_MINUTES: 10,
    MAX_ATTEMPTS: 3,
  },
  RESET_TOKEN: {
    EXPIRY_MINUTES: 25,
    BYTE_LENGTH: 32,
  },
  ADMIN_TEMP_PASSWORD: {
    PREFIX: 'TempPass#',
    RANDOM_CHARS_LENGTH: 6,
    ALLOWED_CHARS: 'ABCDEFGHJKLMNOPQRSTUVWXYZ23456789',
    EXPIRY_HOURS: 24,
  },
} as const;
