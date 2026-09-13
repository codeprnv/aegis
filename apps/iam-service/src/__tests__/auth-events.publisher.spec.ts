import { logger } from '@aegis/common';
import {
  NotificationEvent,
  SecurityEvent,
  enqueueNotification,
  enqueueSecurityEvent,
} from '@aegis/events';
import {
  publishEmailVerificationRequested,
  publishLoginSecurityEvent,
  publishUserRegistered,
} from '../services/events/auth-events.publisher';

jest.mock('@aegis/common', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@aegis/events', () => ({
  NotificationEvent: {
    USER_REGISTERED: 'user.registered',
    EMAIL_VERIFICATION_REQUESTED: 'email.verification.requested',
  },
  SecurityEvent: {
    AUTH_LOGIN_SUCCESS: 'auth.login.success',
  },
  enqueueNotification: jest.fn(),
  enqueueSecurityEvent: jest.fn(),
}));

describe('Auth Events Publisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('publishUserRegistered', () => {
    it('should enqueue USER_REGISTERED event to notification queue', async () => {
      (enqueueNotification as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        userId: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
      };

      publishUserRegistered(payload);

      expect(enqueueNotification).toHaveBeenCalledWith(
        NotificationEvent.USER_REGISTERED,
        payload
      );
    });

    it('should catch and log error gracefully when enqueue fails without throwing', async () => {
      const queueError = new Error('Queue connection timeout');
      (enqueueNotification as jest.Mock).mockRejectedValue(queueError);

      const payload = {
        userId: 'user-123',
        email: 'user@example.com',
        username: 'testuser',
      };

      expect(() => publishUserRegistered(payload)).not.toThrow();

      // Allow microtask queue to process rejection handler
      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'QUEUE_ENQUEUE_FAILURE',
          notification: NotificationEvent.USER_REGISTERED,
          userId: 'user-123',
        }),
        expect.any(String)
      );
    });
  });

  describe('publishEmailVerificationRequested', () => {
    it('should enqueue EMAIL_VERIFICATION_REQUESTED event to notification queue', async () => {
      (enqueueNotification as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        userId: 'pending',
        email: 'user@example.com',
        username: 'testuser',
        verificationToken: 'raw-token-123',
      };

      publishEmailVerificationRequested(payload);

      expect(enqueueNotification).toHaveBeenCalledWith(
        NotificationEvent.EMAIL_VERIFICATION_REQUESTED,
        payload
      );
    });
  });

  describe('publishLoginSecurityEvent', () => {
    it('should enqueue AUTH_LOGIN_SUCCESS event to security queue', async () => {
      (enqueueSecurityEvent as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        userId: 'user-123',
        sessionId: 'session-456',
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'a'.repeat(64),
        timestamp: Date.now(),
      };

      publishLoginSecurityEvent(payload);

      expect(enqueueSecurityEvent).toHaveBeenCalledWith(
        SecurityEvent.AUTH_LOGIN_SUCCESS,
        expect.objectContaining({
          ...payload,
          eventId: expect.any(String),
        })
      );
    });

    it('should preserve explicit eventId when provided', async () => {
      (enqueueSecurityEvent as jest.Mock).mockResolvedValue(undefined);

      const payload = {
        eventId: 'custom-event-123',
        userId: 'user-123',
        sessionId: 'session-456',
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'a'.repeat(64),
        timestamp: Date.now(),
      };

      publishLoginSecurityEvent(payload);

      expect(enqueueSecurityEvent).toHaveBeenCalledWith(
        SecurityEvent.AUTH_LOGIN_SUCCESS,
        payload
      );
    });

    it('should handle security event queue failure without disrupting authentication flow', async () => {
      const queueError = new Error('Redis connection lost');
      (enqueueSecurityEvent as jest.Mock).mockRejectedValue(queueError);

      const payload = {
        userId: 'user-123',
        sessionId: 'session-456',
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'a'.repeat(64),
        timestamp: Date.now(),
      };

      expect(() => publishLoginSecurityEvent(payload)).not.toThrow();

      await new Promise(process.nextTick);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'QUEUE_ENQUEUE_FAILURE',
          securityEvent: SecurityEvent.AUTH_LOGIN_SUCCESS,
          userId: 'user-123',
        }),
        expect.any(String)
      );
    });
  });
});
