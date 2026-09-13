/**
 * Standard network, host, and environment default values.
 */
export const NETWORK_DEFAULTS = {
  DEFAULT_BIND_HOST: '0.0.0.0',
  DEFAULT_IP: '127.0.0.1',
  DEFAULT_LOCAL_REDIS_URL: 'redis://localhost:6379',
  DEFAULT_BODY_LIMIT: '2mb',
  DEFAULT_JSON_LIMIT: '1mb',
  DEFAULT_URLENCODED_LIMIT: '1mb',
} as const;

/**
 * Standard HTTP status code constants.
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;
