import { randomUUID } from 'crypto';
import { logger } from '@aegis/common';
import {
  NotificationEvent,
  SecurityEvent,
  enqueueNotification,
  enqueueSecurityEvent,
  type AuthLoginSuccessPayload,
  type EmailVerificationRequestedPayload,
  type UserRegisteredPayload,
} from '@aegis/events';

/**
 * Data transfer object for login security telemetry dispatch with optional eventId and timestamp fallbacks.
 */
export type PublishLoginSecurityEventPayload = Omit<
  AuthLoginSuccessPayload,
  'eventId' | 'timestamp'
> & {
  eventId?: string;
  timestamp?: number;
};

/**
 * Dispatches a user registration welcome email event to the notification queue.
 *
 * @param payload - Basic identity payload containing user ID, email, and username
 */
export const publishUserRegistered = (payload: UserRegisteredPayload): void => {
  enqueueNotification(NotificationEvent.USER_REGISTERED, payload).catch(
    (err: Error) => {
      logger.error(
        {
          event: 'QUEUE_ENQUEUE_FAILURE',
          severity: 'HIGH',
          notification: NotificationEvent.USER_REGISTERED,
          userId: payload.userId,
          error: err.message,
        },
        'Failed to enqueue welcome email notification'
      );
    }
  );
};

/**
 * Dispatches an email verification request event to the notification queue.
 *
 * @param payload - Verification token and user identity details
 */
export const publishEmailVerificationRequested = (
  payload: EmailVerificationRequestedPayload
): void => {
  enqueueNotification(
    NotificationEvent.EMAIL_VERIFICATION_REQUESTED,
    payload
  ).catch((err: Error) => {
    logger.error(
      {
        event: 'QUEUE_ENQUEUE_FAILURE',
        severity: 'HIGH',
        notification: NotificationEvent.EMAIL_VERIFICATION_REQUESTED,
        userId: payload.userId,
        error: err.message,
      },
      'Failed to enqueue email verification notification'
    );
  });
};

/**
 * Dispatches an authenticated login event to the security audit queue for deep-lane anomaly analysis.
 * Explicitly stamps the emission timestamp to prevent velocity dilution from worker queue lag.
 *
 * @param payload - Client, device, and network telemetry captured during authentication
 */
export const publishLoginSecurityEvent = (
  payload: PublishLoginSecurityEventPayload
): void => {
  const eventId = payload.eventId || randomUUID();
  const timestamp = payload.timestamp || Date.now();

  enqueueSecurityEvent(SecurityEvent.AUTH_LOGIN_SUCCESS, {
    ...payload,
    eventId,
    timestamp,
  }).catch((err: Error) => {
    logger.error(
      {
        event: 'QUEUE_ENQUEUE_FAILURE',
        severity: 'HIGH',
        securityEvent: SecurityEvent.AUTH_LOGIN_SUCCESS,
        userId: payload.userId,
        sessionId: payload.sessionId,
        error: err.message,
      },
      'Failed to enqueue login security telemetry event'
    );
  });
};
