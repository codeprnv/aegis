import { UnauthorizedError, verifyPassword } from '@aegis/common';
import { prisma } from '@aegis/database';
import { loginUser } from '../services/auth.service';

jest.mock('@aegis/database', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('@aegis/common', () => ({
  ...jest.requireActual('@aegis/common'),
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
  generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
}));

describe('Auth Service - loginUser', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    mobile: '1234567890',
    role: 'user',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user with access and refresh tokens on valid credentials', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (verifyPassword as jest.Mock).mockResolvedValue(true);

    const result = await loginUser({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
      select: expect.any(Object),
    });
    expect(verifyPassword).toHaveBeenCalledWith(
      'password123',
      'hashed-password'
    );

    expect(result).toHaveProperty('accessToken', 'mock-access-token');
    expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    expect(result.id).toBe(mockUser.id);
  });

  it('should throw UnauthorizedError if user not found', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      loginUser({ email: 'wrong@example.com', password: 'password' })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError if password invalid', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
    (verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(
      loginUser({ email: 'test@example.com', password: 'wrongpassword' })
    ).rejects.toThrow(UnauthorizedError);
  });
});
