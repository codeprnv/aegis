/**
 * Default network, timeout, and circuit breaker configurations for reverse proxy routes.
 */
export const PROXY_DEFAULTS = {
  TIMEOUT_MS: 8000,
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: 20000,
  CIRCUIT_BREAKER_ERROR_THRESHOLD_PERCENT: 50,
} as const;

/**
 * Standard error codes returned by the API Gateway proxy layer.
 */
export const GATEWAY_ERROR_CODES = {
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
