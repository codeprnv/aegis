/**
 * Canonical reason strings used for session revocation and security event audits.
 */
export const SESSION_REVOCATION_REASONS = {
  MANUAL_USER_LOGOUT: 'User logged out',
  LOGOUT_ALL_DEVICES: 'User logged out from all devices',
  MANUAL_USER_REVOCATION: 'Manual user revocation',
  REVOKE_ALL_OTHER_SESSIONS: 'Revoke all other sessions',
  TOKEN_ROTATION: 'Token rotation',
  TOKEN_REUSE_DETECTED: 'Token reuse detected - potential theft',
  ABSOLUTE_LIFETIME_CAP: 'Session reached absolute 30-day lifetime cap',
  PASSWORD_RESET: 'Password reset',
  PASSWORD_RESET_BY_ADMIN: 'Password reset by admin!',
  PASSWORD_CHANGE_BY_USER: 'Password change by user',
  AUDIT_ANOMALY: 'Audit Service anomaly revocation',
} as const;

export type SessionRevocationReason =
  (typeof SESSION_REVOCATION_REASONS)[keyof typeof SESSION_REVOCATION_REASONS];
