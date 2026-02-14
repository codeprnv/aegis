import { AUTH_CONFIG } from '@aegis/common';
import { prisma, RedisHelper } from '@aegis/database';
import {
  isAccountLocked,
  recordFailedAttempt,
  unlockAccount,
} from '../services/account-lockout.service';

jest.mock('@aegis/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
  RedisHelper: jest.fn().mockImplementation(function (this: any) {
    this.isLocked = jest.fn();
    this.getTTL = jest.fn();
    this.setLockout = jest.fn();
    this.clearLockout = jest.fn();
    this.resetCounter = jest.fn();
    this.incrementWithTTL = jest.fn();
  }),
}));

jest.mock('@aegis/common', () => ({
  AUTH_CONFIG: {
    LOCKOUT_DURATION_SECONDS: 300,
    MAX_FAILED_ATTEMPTS: 3,
    ATTEMPT_WINDOW_SECONDS: 60,
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  REDIS_KEYS: {
    ACCOUNT_LOCKOUT: (email: string) => `lockout:${email}`,
    FAILED_ATTEMPTS: (email: string) => `attempts:${email}`,
  },
}));

describe('Account Lockout Service', () => {
  let mockRedisHelper: any;

  beforeAll(() => {
    const mock = RedisHelper as jest.Mock;
    if (mock.mock.instances.length > 0) {
      mockRedisHelper = mock.mock.instances[0];
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    if (!mockRedisHelper) {
      const mock = RedisHelper as jest.Mock;
      if (mock.mock.instances.length > 0) {
        mockRedisHelper = mock.mock.instances[0];
      }
    }
  });

  const getMock = () => mockRedisHelper;

  describe('isAccountLocked', () => {
    it('should return true if locked in redis', async () => {
      const mock = getMock();
      mock.isLocked.mockResolvedValue(true);
      mock.getTTL.mockResolvedValue(100);

      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
      expect(result.remainingSeconds).toBe(100);
    });

    it('should return true if locked in db and active', async () => {
      const mock = getMock();
      mock.isLocked.mockResolvedValue(false);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountLocked: true,
        lockedUntil: new Date(Date.now() + 100000),
        accountLockedReason: 'Admin lock',
      });

      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
      expect(result.reason).toBe('Admin lock');
    });

    it('should unlock if db lock expired', async () => {
      const mock = getMock();
      mock.isLocked.mockResolvedValue(false);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        accountLocked: true,
        lockedUntil: new Date(Date.now() - 100000), // Expired
      });

      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(false);
      expect(prisma.user.updateMany).toHaveBeenCalled(); // Should call unlock
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment attempts and not lock if below threshold', async () => {
      const mock = getMock();
      mock.incrementWithTTL.mockResolvedValue(2); // Threshold is 3

      const result = await recordFailedAttempt('test@example.com', '127.0.0.1');
      expect(result.shouldLock).toBe(false);
      expect(result.attemptRemaining).toBe(1);
    });

    it('should lock account if threshold reached', async () => {
      const mock = getMock();
      mock.incrementWithTTL.mockResolvedValue(3); // Threshold reached

      const result = await recordFailedAttempt('test@example.com', '127.0.0.1');
      expect(result.shouldLock).toBe(true);
      expect(mock.setLockout).toHaveBeenCalled();
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
          data: expect.objectContaining({ accountLocked: true }),
        })
      );
    });
  });

  describe('unlockAccount', () => {
    it('should clear redis and db lock', async () => {
      const mock = getMock();
      await unlockAccount('test@example.com');
      expect(mock.clearLockout).toHaveBeenCalled();
      expect(mock.resetCounter).toHaveBeenCalled();
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
          data: expect.objectContaining({ accountLocked: false }),
        })
      );
    });
  });
});
