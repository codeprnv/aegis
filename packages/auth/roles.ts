/**
 * Canonical user authorization roles in Aegis.
 */
export const AUTH_ROLES = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  RESTRICTED: 'RESTRICTED',
  GUEST: 'guest',
} as const;

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];

/**
 * Standard sentinel user identifiers for unauthenticated or system flows.
 */
export const SENTINEL_USERS = {
  ANONYMOUS: 'anonymous',
  PENDING: 'pending',
  SYSTEM: 'system',
} as const;
