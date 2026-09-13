/**
 * Canonical microservice identifiers across the Aegis distributed architecture.
 */
export const SERVICE_NAMES = {
  GATEWAY: 'api-gateway',
  IAM: 'iam-service',
  NOTIFICATION: 'notification-service',
  AUDIT: 'audit-service',
  USER: 'user-service',
  STORAGE: 'file-storage-service',
  ROLES: 'roles-service',
} as const;

export type ServiceName = (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES];
