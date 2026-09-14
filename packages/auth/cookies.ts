/**
 * Canonical authentication cookie names used across client, gateway, and IAM.
 */
export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;

/**
 * Standard cookie duration constants in milliseconds.
 */
export const AUTH_COOKIE_MAX_AGE_MS = {
  ACCESS_TOKEN: 15 * 60 * 1000, // 15 minutes
  REFRESH_TOKEN_DEFAULT: 7 * 24 * 60 * 60 * 1000, // 7 days
  REFRESH_TOKEN_REMEMBER_ME: 15 * 24 * 60 * 60 * 1000, // 15 days
} as const;

/**
 * Default security options for auth cookies.
 */
export const DEFAULT_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
};

export const REFRESH_COOKIE_OPTIONS = {
  ...DEFAULT_COOKIE_OPTIONS,
  path: '/api/v1/auth/refresh',
};
