export enum NotificationEvent {
  USER_REGISTERED = 'user.registered',
  EMAIL_VERIFICATION_REQUESTED = 'email.verification.requested',
  PASSWORD_RESET_REQUESTED = 'password.reset.requested',
  PASSWORD_RESET_COMPLETED = 'password.reset.completed',
  PASSWORD_CHANGED = 'password.changed',
  ADMIN_PASSWORD_RESET = 'admin.password.reset',
}

// ----- Payload Interfaces ----

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  username: string;
}

export interface EmailVerificationRequestedPayload {
  userId: string;
  email: string;
  username: string;
  verificationToken: string;
}

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
  username: string;
  otp: string;
  otpExpiresAt: Date;
  resetToken?: string;
}

export interface PasswordResetCompletedPayload {
  userId: string;
  email: string;
  username: string;
}

export interface PasswordChangePayload {
  userId: string;
  email: string;
  username: string;
}

export interface AdminPasswordResetPayload {
  userId: string;
  email: string;
  username: string;
  temporaryPassword: string;
}

/* Union type mapping each event to its payload */

export type NotificationPayloadMap = {
  [NotificationEvent.USER_REGISTERED]: UserRegisteredPayload;
  [NotificationEvent.EMAIL_VERIFICATION_REQUESTED]: EmailVerificationRequestedPayload;
  [NotificationEvent.PASSWORD_RESET_REQUESTED]: PasswordResetRequestedPayload;
  [NotificationEvent.PASSWORD_RESET_COMPLETED]: PasswordResetCompletedPayload;
  [NotificationEvent.PASSWORD_CHANGED]: PasswordChangePayload;
  [NotificationEvent.ADMIN_PASSWORD_RESET]: AdminPasswordResetPayload;
};

// ---- Security Event Types & Payloads ----

export enum SecurityEvent {
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_SESSION_REVOKE = 'auth.session.revoke',
  AUTH_ANOMALY_IMPOSSIBLE_TRAVEL = 'auth.anomaly.impossible_travel',
  AUTH_ANOMALY_NEW_DEVICE = 'auth.anomaly.new_device',
}

export interface AuthLoginSuccessPayload {
  eventId: string;
  userId: string;
  sessionId: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  timestamp: number;
}

export interface AuthSessionRevokePayload {
  sessionId: string;
  userId: string;
  reason: string;
  source: 'AUDIT_SERVICE' | 'USER' | 'ADMIN';
}

export interface ImpossibleTravelPayload {
  userId: string;
  sessionId: string;
  email: string;
  currentCity?: string;
  previousCity?: string;
  velocityKmH: number;
  timestamp: number;
}

export interface NewDevicePayload {
  userId: string;
  email: string;
  deviceName?: string;
  browserName?: string;
  osName?: string;
  ipAddress: string;
  timestamp: number;
}

/*
 ** Union type mapping each security event to its corresponding payload
 */
export type SecurityPayloadMap = {
  [SecurityEvent.AUTH_LOGIN_SUCCESS]: AuthLoginSuccessPayload;
  [SecurityEvent.AUTH_SESSION_REVOKE]: AuthSessionRevokePayload;
  [SecurityEvent.AUTH_ANOMALY_IMPOSSIBLE_TRAVEL]: ImpossibleTravelPayload;
  [SecurityEvent.AUTH_ANOMALY_NEW_DEVICE]: NewDevicePayload;
};
