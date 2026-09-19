export * from './audit.server.config.js';
export * from './audit.worker.config.js';

/**
 * Anomaly Engine velocity and geographic thresholds.
 */
export const ANOMALY_CONFIG = {
  /**
   * Maximum physically feasible human travel velocity in km/h.
   * Transcontinental commercial flights travel at ~900-1000 km/h.
   * Velocities exceeding 1200 km/h indicate impossible physical movement.
   */
  VELOCITY_THRESHOLD_KM_H: 1200,

  /**
   * Minimum elapsed time in minutes required between logins before velocity
   * is evaluated, damping cellular tower hopping and concurrent multi-device logins.
   */
  VELOCITY_MIN_DELTA_MINUTES: 5,

  /**
   * Maximum distance in kilometers attributable to cellular tower hopping or ISP routing jitter.
   * Within the velocity damping window (e.g. < 5 minutes), movements exceeding this radius
   * bypass the damping forgiveness and trigger an immediate impossible-travel anomaly.
   */
  MAX_JITTER_DISTANCE_KM: 250,

  /**
   * Time-to-live in seconds for cached IP geolocation lookups in Redis (24 hours).
   */
  GEO_CACHE_TTL_SECONDS: 86400,

  /**
   * Time-to-live in seconds for user-device location coordinates in Redis (30 days).
   */
  USER_GEO_CACHE_TTL_SECONDS: 2592000,

  /**
   * Request timeout in milliseconds for external GeoIP provider queries.
   */
  GEO_PROVIDER_TIMEOUT_MS: 2000,

  /**
   * File path to the local MaxMind GeoLite2 City database file (.mmdb).
   */
  MAXMIND_DB_PATH:
    process.env.MAXMIND_DB_PATH || 'data/GeoLite2-City.mmdb',

  /**
   * Optional API token for IPinfo.io HTTPS fallback queries.
   */
  IPINFO_TOKEN: process.env.IPINFO_TOKEN || '',

  /**
   * Redis key for the GeoIP external provider circuit breaker.
   */
  GEO_CIRCUIT_BREAKER_KEY: 'aegis:geo:circuit-breaker',

  /**
   * Circuit breaker open duration in seconds when rate limits (429) are encountered.
   */
  GEO_CIRCUIT_BREAKER_TTL_SECONDS: 60,
} as const;
