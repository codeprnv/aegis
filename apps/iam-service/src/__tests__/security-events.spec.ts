import { SecurityEvent, enqueueSecurityEvent } from '@aegis/events';
import { sanitizeHeaders } from '@aegis/middlewares';
import type { Request, Response } from 'express';

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  }));
  return {
    __esModule: true,
    default: MockRedis,
    Redis: MockRedis,
  };
});

const mockAdd = jest.fn().mockResolvedValue({ id: 'mock-job-1' });

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('Phase 1: Shared Packages & Event Contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SecurityEvent Enums & Producer', () => {
    it('should define all required security event types', () => {
      expect(SecurityEvent.AUTH_LOGIN_SUCCESS).toBe('auth.login.success');
      expect(SecurityEvent.AUTH_SESSION_REVOKE).toBe('auth.session.revoke');
      expect(SecurityEvent.AUTH_ANOMALY_IMPOSSIBLE_TRAVEL).toBe(
        'auth.anomaly.impossible_travel'
      );
      expect(SecurityEvent.AUTH_ANOMALY_NEW_DEVICE).toBe(
        'auth.anomaly.new_device'
      );
    });

    it('should enqueue auth.login.success event with custom eventId', async () => {
      const payload = {
        eventId: 'event-uuid-1',
        userId: 'user-123',
        sessionId: 'session-456',
        email: 'test@example.com',
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'fp-sha256',
        timestamp: Date.now(),
      };

      await enqueueSecurityEvent(SecurityEvent.AUTH_LOGIN_SUCCESS, payload);

      expect(mockAdd).toHaveBeenCalledWith(
        SecurityEvent.AUTH_LOGIN_SUCCESS,
        payload,
        expect.objectContaining({ jobId: 'event-uuid-1' })
      );
    });

    it('should enqueue auth.session.revoke event', async () => {
      const payload = {
        sessionId: 'session-456',
        userId: 'user-123',
        reason: 'Impossible travel detected',
        source: 'AUDIT_SERVICE' as const,
      };

      await enqueueSecurityEvent(SecurityEvent.AUTH_SESSION_REVOKE, payload);

      expect(mockAdd).toHaveBeenCalledWith(
        SecurityEvent.AUTH_SESSION_REVOKE,
        payload,
        expect.objectContaining({
          jobId: expect.stringContaining('auth.session.revoke:user-123:'),
        })
      );
    });
  });

  describe('sanitizeHeaders Middleware', () => {
    it('should strip spoofed internal identity and correlation headers', () => {
      const req = {
        headers: {
          'x-user-id': 'spoofed-admin-id',
          'x-user-role': 'ADMIN',
          'x-user-email': 'admin@aegis.com',
          'x-session-id': 'spoofed-session',
          'x-internal-token': 'fake-token',
          'x-correlation-id': 'fake-trace',
          'x-auth-context': 'admin-context',
          authorization: 'Bearer valid-jwt',
          'content-type': 'application/json',
        },
      } as unknown as Request;

      const res = {} as Response;
      const next = jest.fn();

      sanitizeHeaders(req, res, next);

      expect(req.headers['x-user-id']).toBeUndefined();
      expect(req.headers['x-user-role']).toBeUndefined();
      expect(req.headers['x-user-email']).toBeUndefined();
      expect(req.headers['x-session-id']).toBeUndefined();
      expect(req.headers['x-internal-token']).toBeUndefined();
      expect(req.headers['x-correlation-id']).toBeUndefined();
      expect(req.headers['x-auth-context']).toBeUndefined();
      expect(req.headers['authorization']).toBe('Bearer valid-jwt');
      expect(req.headers['content-type']).toBe('application/json');
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
