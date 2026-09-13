/**
 * Edge blocklist time-to-live in seconds (15-minute access token + 60s skew buffer).
 * Single source of truth for session rotation, logout, and anomaly engine revocations (SEC-01, SEC-11).
 */
export const EDGE_REVOCATION_TTL_SECONDS = 960;

/**
 * Edge Redis keys and sentinels for session revocation.
 */
export const REDIS_AUTH_KEYS = {
  REVOKED_SESSION: (sessionId: string): string =>
    `aegis:revoked:session:${sessionId}`,
} as const;

/**
 * Sentinel value written to Redis blocklist for revoked sessions.
 */
export const REDIS_REVOKED_SENTINEL = 'revoked';
