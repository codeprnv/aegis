/**
 * Lifecycle status of a notification record in the database.
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
  IGNORED = 'ignored',
}

/**
 * Delivery channels supported by the notification service.
 */
export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}
