import { logger, validatePassword, verifyPassword } from '@aegis/common';
import { prisma } from '@aegis/database';
import { BadRequestError } from '@aegis/middlewares';
const {
  canUsePassword,
  validateAndStorePassword,
} = require('../services/password-history.service');

jest.mock('@aegis/common', () => ({
  ...jest.requireActual('@aegis/common'),
  validatePassword: jest.fn(),
  verifyPassword: jest.fn(),
  logger: jest.fn(),
}));

jest.mock('@aegis/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('@aegis/middlewares', () => ({
  BadRequestError: jest.fn(),
}));

describe('Change Password Service', () => {
  describe('changePassword', () => {
    it('should change password with valid current password', async () => {
      const mockUser = {
        id: '123',
        email: 'abc123@gmail.com',
        passwordHash: 'currentPasswordHash@123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (verifyPassword as jest.Mock).mockResolvedValue(true);

      await canUsePassword(mockUser.id, 'newPassword@123');
      await validateAndStorePassword(mockUser.id, 'newPassword@123');

      (prisma.session.updateMany as jest.Mock).mockImplementation(() => ({
        where: {
          userId: mockUser.id,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          revokedReason: 'Password change by user',
        },
      }));
    });
  });
});

// TODO: change the test cases to actual test mocks
