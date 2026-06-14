import { AUTH_CONFIG } from '@aegis/common';
import { prisma } from '@aegis/database';
import {
  isAccountLocked,
  recordFailedAttempt,
  unlockAccount,
} from '../services/account-lockout.service';

const mockIsLocked = jest.fn();
const mockGetTTL = jest.fn();
const mockIncrementWithTTL = jest.fn();
const mockSetLockout = jest.fn();
const mockClearLockout = jest.fn();
const mockResetCounter = jest.fn();

jest.mock('@aegis/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
  isLocked: (...args: any[]) => mockIsLocked(...args),
  getTTL: (...args: any[]) => mockGetTTL(...args),
  incrementWithTTL: (...args: any[]) => mockIncrementWithTTL(...args),
  setLockout: (...args: any[]) => mockSetLockout(...args),
  clearLockout: (...args: any[]) => mockClearLockout(...args),
  resetCounter: (...args: any[]) => mockResetCounter(...args),
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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isAccountLocked', () => {
    it('should return true if locked in redis', async () => {
      mockIsLocked.mockResolvedValue(true);
      mockGetTTL.mockResolvedValue(100);

      const result = await isAccountLocked('test@example.com');
      expect(result.locked).toBe(true);
      expect(result.remainingSeconds).toBe(100);
    });

    it('should return true if locked in db and active', async () => {
      mockIsLocked.mockResolvedValue(false);
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
      mockIsLocked.mockResolvedValue(false);
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
      mockIncrementWithTTL.mockResolvedValue(2); // Threshold is 3

      const result = await recordFailedAttempt('test@example.com', '127.0.0.1');
      expect(result.shouldLock).toBe(false);
      expect(result.attemptRemaining).toBe(1);
    });

    it('should lock account if threshold reached', async () => {
      mockIncrementWithTTL.mockResolvedValue(3); // Threshold reached

      const result = await recordFailedAttempt('test@example.com', '127.0.0.1');
      expect(result.shouldLock).toBe(true);
      expect(mockSetLockout).toHaveBeenCalled();
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
      await unlockAccount('test@example.com');
      expect(mockClearLockout).toHaveBeenCalled();
      expect(mockResetCounter).toHaveBeenCalled();
      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
          data: expect.objectContaining({ accountLocked: false }),
        })
      );
    });
  });
});
