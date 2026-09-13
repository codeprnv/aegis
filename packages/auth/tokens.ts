/**
 * Standard token expiration durations across Aegis authentication lifecycles.
 */
export const TOKEN_EXPIRATIONS = {
  ACCESS_TOKEN: '15m',
  REFRESH_TOKEN: '7d',
  REFRESH_TOKEN_DAYS: 7,
  REMEMBER_ME_DAYS: 15,
  INTERNAL_TOKEN: '1m',
} as const;

/**
 * Standard token issuers across the platform.
 */
export const JWT_ISSUERS = {
  IAM: 'iam-service',
  GATEWAY: 'aegis-gateway',
} as const;

/**
 * Standard token audiences across the platform.
 */
export const JWT_AUDIENCES = {
  CLIENT: 'aegis-client',
  INTERNAL: 'aegis-internal',
  IAM: 'iam-service',
  NOTIFICATION: 'notification-service',
  AUDIT: 'audit-service',
} as const;

/**
 * Token type discriminator values.
 */
export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
} as const;

/**
 * Cryptographic signing algorithms used for JWTs.
 */
export const JWT_SIGNING_ALGORITHMS = {
  ASYMMETRIC: 'RS256',
  SYMMETRIC: 'HS256',
} as const;

/**
 * Clock skew tolerance in seconds for JWT verification.
 */
export const CLOCK_TOLERANCE_SECONDS = 5;
