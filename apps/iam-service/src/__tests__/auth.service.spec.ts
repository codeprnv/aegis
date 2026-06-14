import { verifyPassword } from '@aegis/common';
import { prisma } from '@aegis/database';
import { ForbiddenError, UnauthorizedError } from '@aegis/middlewares';
import {
  isAccountLocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from '../services/account-lockout.service';
import { loginUser } from '../services/auth.service';

jest.mock('@aegis/database', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => {
      // Mock the transaction object `tx` to be the same as `prisma`
      const tx = {
        user: { 
          create: jest.fn().mockResolvedValue({ id: 'test-user-id', username: 'testuser', email: 'test@example.com', role: 'USER' }), 
          update: jest.fn() 
        },
        session: { create: jest.fn(), updateMany: jest.fn() },
        passwordHistory: { create: jest.fn() },
      };
      return cb(tx);
    }),
  },
}));

jest.mock('@aegis/common', () => ({
  ...jest.requireActual('@aegis/common'),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  hashTokenSHA256: jest.fn().mockReturnValue('mock-sha256-hash'),
}));

jest.mock('@aegis/auth', () => ({
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
}));

jest.mock('../services/account-lockout.service', () => ({
  isAccountLocked: jest.fn(),
  recordFailedAttempt: jest.fn(),
  recordSuccessfulLogin: jest.fn(),
}));

describe('Auth Service - loginUser', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    mobile: '1234567890',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user with access and refresh tokens on valid credentials', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });
    (verifyPassword as jest.Mock).mockResolvedValue(true);
    (recordSuccessfulLogin as jest.Mock).mockResolvedValue(undefined);

    const result = await loginUser({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: expect.any(Object),
    });
    expect(isAccountLocked).toHaveBeenCalledWith('test@example.com');
    expect(verifyPassword).toHaveBeenCalledWith(
      'password123',
      'hashed-password'
    );
    expect(recordSuccessfulLogin).toHaveBeenCalledWith('test@example.com');

    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    expect(result.id).toBe(mockUser.id);
  });

  it('should throw UnauthorizedError if user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      loginUser({ email: 'wrong@example.com', password: 'password' })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw ForbiddenError if account is locked', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (isAccountLocked as jest.Mock).mockResolvedValue({
      locked: true,
      reason: 'Admin lock',
    });

    await expect(
      loginUser({ email: 'test@example.com', password: 'password' })
    ).rejects.toThrow(ForbiddenError);
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedError and record attempt if password invalid', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });
    (verifyPassword as jest.Mock).mockResolvedValue(false);
    (recordFailedAttempt as jest.Mock).mockResolvedValue({ shouldLock: false });

    await expect(
      loginUser({ email: 'test@example.com', password: 'wrongpassword' })
    ).rejects.toThrow(UnauthorizedError);

    expect(recordFailedAttempt).toHaveBeenCalledWith(
      'test@example.com',
      undefined
    );
  });

  it('should throw ForbiddenError if account gets locked after failed attempt', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (isAccountLocked as jest.Mock).mockResolvedValue({ locked: false });
    (verifyPassword as jest.Mock).mockResolvedValue(false);
    (recordFailedAttempt as jest.Mock).mockResolvedValue({ shouldLock: true });

    await expect(
      loginUser({ email: 'test@example.com', password: 'wrongpassword' })
    ).rejects.toThrow(ForbiddenError);

    expect(recordFailedAttempt).toHaveBeenCalled();
  });
});
