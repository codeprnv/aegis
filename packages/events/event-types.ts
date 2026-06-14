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
