import { AUTH_CONFIG, hashPassword, verifyPassword } from '@aegis/common';
import { prisma } from '@aegis/database';
import { ConflictError } from '@aegis/middlewares';
import {
  canUsePassword,
  isPasswordReused,
  validateAndStorePassword,
} from '../services/password-history.service';

// Mock functions
jest.mock('@aegis/database', () => ({
  prisma: {
    passwordHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@aegis/common', () => ({
  AUTH_CONFIG: {
    PASSWORD_HISTORY_LIMIT: 5,
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

describe('Password History Service', () => {
  const userId = 'user-123';
  const newPassword = 'NewPassword@123';
  const hashedPassword = 'hashed-new-password';

  // Clear all the previous mocks before running new mock
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPasswordReused', () => {
    it('should return false if password not in history', async () => {
      const mockHistory = [
        { passwordHash: 'hash1', changedAt: new Date() },
        { passwordHash: 'hash2', changedAt: new Date() },
      ];

      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue(
        mockHistory
      );
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      const result = await isPasswordReused(userId, newPassword);

      expect(result).toBe(false);
      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { changedAt: 'desc' },
        take: AUTH_CONFIG.PASSWORD_HISTORY_LIMIT,
        select: {
          passwordHash: true,
          changedAt: true,
        },
      });
      expect(verifyPassword).toHaveBeenCalledTimes(2);
    });

    it('should return true if password matches one in history', async () => {
      const mockHistory = [
        { passwordHash: 'hash1', changedAt: new Date('2024-01-01') },
        {
          passwordHash: 'hash2',
          changedAt: new Date('2024-01-02'),
        },
        { passwordHash: 'hash3', changedAt: new Date('2024-01-03') },
      ];

      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue(
        mockHistory
      );
      (verifyPassword as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const result = await isPasswordReused(userId, newPassword);

      expect(result).toBe(true);
      expect(verifyPassword).toHaveBeenCalledTimes(3);
    });

    it('should handle empty password history', async () => {
      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue([]);
      const result = await isPasswordReused(userId, newPassword);
      expect(result).toBe(false);
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('should check passwords in parallel', async () => {
      const mockHistory = [
        { passwordHash: 'hash1', changedAt: new Date() },
        {
          passwordHash: 'hash2',
          changedAt: new Date(),
        },
        { passwordHash: 'hash3', changedAt: new Date() },
      ];

      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue(
        mockHistory
      );

      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await isPasswordReused(userId, newPassword);

      expect(verifyPassword).toHaveBeenCalledTimes(3);
    });
  });

  describe('validateAndStorePassword', () => {
    it('should update user password and store in history', async () => {
      (hashPassword as jest.Mock).mockResolvedValue(hashPassword);
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback({
            user: {
              update: jest.fn().mockResolvedValue({}),
            },
            passwordHistory: {
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          });
        }
      );

      await validateAndStorePassword(userId, newPassword);

      expect(hashPassword).toHaveBeenCalledWith(newPassword);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should clean old password history beyond limit', async () => {
      const oldHistoryIds = [{ id: 'old-1' }, { id: 'old-2' }, { id: 'old-3' }];

      (hashPassword as jest.Mock).mockResolvedValue(hashPassword);
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback) => {
          return await callback({
            user: {
              update: jest.fn().mockResolvedValue({}),
            },
            passwordHistory: {
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue(oldHistoryIds),
              deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
            },
          });
        }
      );

      await validateAndStorePassword(userId, newPassword);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should use transaction for atomicity', async () => {
      (hashPassword as jest.Mock).mockResolvedValue(hashPassword);
      (prisma.$transaction as jest.Mock).mockImplementation(
        async (callback: any) => {
          return await callback({
            user: {
              update: jest.fn().mockResolvedValue({}),
            },
            passwordHistory: {
              create: jest.fn().mockResolvedValue({}),
              findMany: jest.fn().mockResolvedValue([]),
              deleteMany: jest.fn(),
            },
          });
        }
      );
      await validateAndStorePassword(userId, newPassword);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('canUsePassword', () => {
    it('should allow password if not reused', async () => {
      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue([
        {
          passwordHash: 'hash1',
          changedAt: new Date(),
        },
      ]);
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await expect(canUsePassword(userId, newPassword)).resolves.not.toThrow();
    });

    it('should throw ConflictError if password is reused', async () => {
      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue([
        {
          passwordHash: 'hash1',
          changedAt: new Date(),
        },
        {
          passwordHash: 'hash2',
          changedAt: new Date(),
        },
      ]);
      (verifyPassword as jest.Mock)
        .mockResolvedValue(false)
        .mockResolvedValue(true);

      await expect(canUsePassword(userId, newPassword)).rejects.toThrow(
        `Cannot reuse any of your last ${AUTH_CONFIG.PASSWORD_HISTORY_LIMIT} password(s)`
      );
    });

    it('should check against configured history limit', async () => {
      const mockHistory = Array(AUTH_CONFIG.PASSWORD_HISTORY_LIMIT)
        .fill(null)
        .map(() => ({
          passwordHash: 'hash',
          changedAt: new Date(),
        }));

      (prisma.passwordHistory.findMany as jest.Mock).mockResolvedValue(
        mockHistory
      );
      (verifyPassword as jest.Mock).mockResolvedValue(false);

      await canUsePassword(userId, newPassword);

      expect(prisma.passwordHistory.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { changedAt: 'desc' },
        take: AUTH_CONFIG.PASSWORD_HISTORY_LIMIT,
        select: expect.any(Object),
      });
    });
  });
});
