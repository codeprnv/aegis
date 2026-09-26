/**
 * Canonical HTTP headers used across Aegis microservices, edge gateways, and client requests.
 */
export const HTTP_HEADERS = {
  CORRELATION_ID: 'x-correlation-id',
  AUTHORIZATION: 'authorization',
  CONTENT_TYPE: 'content-type',
  USER_AGENT: 'user-agent',
  FORWARDED_FOR: 'x-forwarded-for',
  REAL_IP: 'x-real-ip',
  VERCEL_FORWARDED_FOR: 'x-vercel-forwarded-for',
  VERCEL_IP: 'x-vercel-ip',
  CF_CONNECTING_IP: 'cf-connecting-ip',
  AEGIS_SIGNATURE: 'x-aegis-signature',
  DEVICE_FINGERPRINT: 'x-device-fingerprint',
  DEVICE_INSTANCE_ID: 'x-device-instance-id',
  SESSION_ID: 'x-session-id',
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_EMAIL: 'x-user-email',
  INTERNAL_TOKEN: 'x-internal-token',
  AUTH_CONTEXT: 'x-auth-context',
  ACCEPT_LANGUAGE: 'accept-language',
  CLIENT_HINTS: {
    SEC_CH_UA: 'sec-ch-ua',
    SEC_CH_UA_PLATFORM: 'sec-ch-ua-platform',
  },
} as const;

/**
 * Sensitive internal headers stripped at the API Gateway edge to prevent ingress spoofing.
 */
export const SENSITIVE_HEADERS = [
  HTTP_HEADERS.USER_ID,
  HTTP_HEADERS.USER_ROLE,
  HTTP_HEADERS.USER_EMAIL,
  HTTP_HEADERS.SESSION_ID,
  HTTP_HEADERS.INTERNAL_TOKEN,
  HTTP_HEADERS.CORRELATION_ID,
  HTTP_HEADERS.AUTH_CONTEXT,
  HTTP_HEADERS.AEGIS_SIGNATURE,
] as const;
