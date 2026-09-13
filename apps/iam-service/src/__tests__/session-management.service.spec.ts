import { REDIS_AUTH_KEYS } from '@aegis/auth';
import { prisma, redis } from '@aegis/database';
import { NotFoundError, UnauthorizedError } from '@aegis/middlewares';
import {
  createSessionRecord,
  listUserSessions,
  revokeAllOtherSessions,
  revokeSession,
} from '../services/session/session-management.service';

const mockPipeline = {
  setex: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue([]),
};

jest.mock('@aegis/database', () => ({
  prisma: {
    session: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
  redis: {
    setex: jest.fn(),
    pipeline: jest.fn(() => mockPipeline),
  },
}));

describe('Session Management Service', () => {
  const userId = 'user-123';
  const currentSessionId = 'session-current';
  const otherSessionId = 'session-other';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSessionRecord', () => {
    it('should create a session record in the database using the provided transaction client', async () => {
      const mockTx = {
        session: {
          create: jest.fn().mockResolvedValue({ id: 'new-session' }),
        },
      };

      const options = {
        sessionId: 'new-session',
        userId: 'user-123',
        refreshTokenHash: 'hash-abc',
        expiresAt: new Date(),
        tokenFamily: 'family-xyz',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceType: 'desktop',
        browserName: 'Chrome',
      };

      const result = await createSessionRecord(mockTx as any, options);

      expect(result).toEqual({ id: 'new-session' });
      expect(mockTx.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'new-session',
          userId: 'user-123',
          refreshTokenHash: 'hash-abc',
          deviceType: 'desktop',
          browserName: 'Chrome',
        }),
      });
    });
  });

  describe('listUserSessions', () => {
    it('should list active sessions and flag the current session correctly', async () => {
      const mockSessions = [
        {
          id: currentSessionId,
          deviceType: 'desktop',
          deviceName: 'MacBook Pro',
          osName: 'macOS',
          osVersion: '14.0',
          browserName: 'Chrome',
          browserVersion: '120.0',
          ipAddress: '192.168.1.1',
          lastUsedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: otherSessionId,
          deviceType: 'mobile',
          deviceName: 'iPhone 15',
          osName: 'iOS',
          osVersion: '17.0',
          browserName: 'Safari',
          browserVersion: '17.0',
          ipAddress: '192.168.1.2',
          lastUsedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

      const result = await listUserSessions(userId, currentSessionId);

      expect(result).toHaveLength(2);
      expect(result[0].isCurrent).toBe(true);
      expect(result[1].isCurrent).toBe(false);
      expect(prisma.session.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
        orderBy: { lastUsedAt: 'desc' },
        select: expect.any(Object),
      });
    });
  });

  describe('revokeSession', () => {
    it('should revoke session and set Redis key with 960s TTL when authorized', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: otherSessionId,
        userId,
        revokedAt: null,
      });
      (prisma.session.update as jest.Mock).mockResolvedValue({});
      (redis.setex as jest.Mock).mockResolvedValue('OK');

      await revokeSession(userId, otherSessionId);

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: otherSessionId },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'Manual user revocation',
        },
      });
      expect(redis.setex).toHaveBeenCalledWith(
        REDIS_AUTH_KEYS.REVOKED_SESSION(otherSessionId),
        960,
        'revoked'
      );
    });

    it('should throw NotFoundError if session does not belong to user', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: otherSessionId,
        userId: 'different-user',
        revokedAt: null,
      });

      await expect(revokeSession(userId, otherSessionId)).rejects.toThrow(
        NotFoundError
      );
      expect(prisma.session.update).not.toHaveBeenCalled();
      expect(redis.setex).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if session does not exist', async () => {
      (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(revokeSession(userId, otherSessionId)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all other sessions and batch set Redis blocklist via pipeline', async () => {
      const mockOtherSessions = [{ id: 'session-2' }, { id: 'session-3' }];
      (prisma.session.findMany as jest.Mock).mockResolvedValue(
        mockOtherSessions
      );
      (prisma.session.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      const count = await revokeAllOtherSessions(userId, currentSessionId);

      expect(count).toBe(2);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['session-2', 'session-3'] },
          userId,
        },
        data: {
          revokedAt: expect.any(Date),
          revokedReason: 'Revoke all other sessions',
        },
      });
      expect(redis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.setex).toHaveBeenCalledWith(
        REDIS_AUTH_KEYS.REVOKED_SESSION('session-2'),
        960,
        'revoked'
      );
      expect(mockPipeline.setex).toHaveBeenCalledWith(
        REDIS_AUTH_KEYS.REVOKED_SESSION('session-3'),
        960,
        'revoked'
      );
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should throw UnauthorizedError if currentSessionId is missing', async () => {
      await expect(revokeAllOtherSessions(userId, '')).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should return 0 when there are no other active sessions', async () => {
      (prisma.session.findMany as jest.Mock).mockResolvedValue([]);

      const count = await revokeAllOtherSessions(userId, currentSessionId);

      expect(count).toBe(0);
      expect(prisma.session.updateMany).not.toHaveBeenCalled();
      expect(mockPipeline.exec).not.toHaveBeenCalled();
    });
  });
});
