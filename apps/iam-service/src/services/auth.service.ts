import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@aegis/auth';
import {
  AUTH_CONFIG,
  hashPassword,
  validatePassword,
  verifyPassword,
} from '@aegis/common';
import { prisma } from '@aegis/database';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
} from '@aegis/middlewares';
import { randomUUID } from 'crypto';
import { UAParser } from 'ua-parser-js';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
} from '../types/auth.types';
import {
  isAccountLocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from './account-lockout.service';

export const registerUser = async (
  input: RegisterInput
): Promise<AuthResponse> => {
  const { username, email, password, mobile, userAgent, ipAddress } = input;

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.success) {
    throw new BadRequestError(passwordValidation.error || 'Invalid password');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { email: true, username: true },
  });

  if (existingUser) {
    throw new ConflictError(
      'A user with this email or username already exists'
    );
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Parse user agent
  const parser = new UAParser(userAgent || '');
  const deviceInfo = parser.getResult();

  // Generate session ID and token family ID
  const sessionId = randomUUID();
  const tokenFamilyId = randomUUID();

  // Create the user and session transactionally
  const user = await prisma.$transaction(
    async (tx) => {
      // Create the user
      const createdUser = await tx.user.create({
        data: {
          username,
          email,
          passwordHash,
          mobile: mobile || null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          mobile: true,
          role: true,
          createdAt: true,
        },
      });

      // Store the current password hash to password history table
      await tx.passwordHistory.create({
        data: {
          userId: createdUser.id,
          passwordHash: passwordHash,
        },
      });

      return createdUser;
    },
    {
      maxWait: AUTH_CONFIG.MAX_TRANSACTION_WAIT,
      timeout: AUTH_CONFIG.TRANSACTION_TIMEOUT,
    }
  );

  const accessToken = generateAccessToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  const refreshToken = generateRefreshToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: sessionId,
    },
    'iam-service',
    'aegis-client'
  );

  const refreshTokenHash = await hashPassword(refreshToken);
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: refreshTokenHash,
      expiresAt: expiresAt,
      lastUsedAt: new Date(),
      userAgent,
      ipAddress,
      deviceType: deviceInfo.device.type || 'desktop',
      deviceName: deviceInfo.device.model || undefined,
      osName: deviceInfo.os.name || undefined,
      osVersion: deviceInfo.os.version || undefined,
      browserName: deviceInfo.browser.name || undefined,
      browserVersion: deviceInfo.browser.version || undefined,
      tokenFamily: tokenFamilyId,
    },
  });

  return {
    ...user,
    accessToken,
    refreshToken,
    sessionId: sessionId,
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  const { email, password, userAgent, ipAddress } = input;

  const { locked, reason } = await isAccountLocked(email);
  if (locked) {
    throw new ForbiddenError(reason || 'Account is locked!');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      username: true,
      mobile: true,
      role: true,
      createdAt: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    await recordFailedAttempt(email, ipAddress);
    throw new UnauthorizedError('Invalid email or password');
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    const { shouldLock, attemptRemaining } = await recordFailedAttempt(
      email,
      ipAddress
    );
    if (shouldLock) {
      throw new ForbiddenError(`Account temporarily locked, Try again later!`);
    }
    throw new UnauthorizedError(
      `Invalid email or password. ${attemptRemaining} attempt(s) remaining before account lockout!`
    );
  }

  const parser = new UAParser(userAgent || '');
  const deviceInfo = parser.getResult();

  const sessionId = randomUUID();
  const tokenFamilyId = randomUUID();

  await recordSuccessfulLogin(email);

  const accessToken = generateAccessToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  const refreshToken = generateRefreshToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: sessionId,
    },
    'iam-service',
    'aegis-client'
  );

  const refreshTokenHash = await hashPassword(refreshToken); // reuse the hash password util for hashing refresh token
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Create Session in database
  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: refreshTokenHash,
      expiresAt: expiresAt,
      lastUsedAt: new Date(),
      userAgent,
      ipAddress,
      deviceType: deviceInfo.device.type || 'desktop',
      deviceName: deviceInfo.device.model || undefined,
      osName: deviceInfo.os.name || undefined,
      osVersion: deviceInfo.os.version || undefined,
      browserName: deviceInfo.browser.name || undefined,
      browserVersion: deviceInfo.browser.version || undefined,
      tokenFamily: tokenFamilyId,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    accessToken,
    refreshToken,
    sessionId: sessionId,
  };
};

export const refreshTokenService = async (
  oldRefreshToken: string,
  ipAddress?: string
): Promise<AuthResponse> => {
  const decoded = verifyRefreshToken(oldRefreshToken);

  if (!decoded.sessionId) {
    throw new UnauthorizedError('Invalid refresh token format!');
  }

  const session = await prisma.session.findUnique({
    where: {
      id: decoded.sessionId,
    },
  });

  if (!session) {
    throw new UnauthorizedError('Invalid or expired refresh token!');
  }

  // Check expiry first
  if (session.expiresAt < new Date()) {
    throw new UnauthorizedError(
      'Refresh token has expired. Please log in again'
    );
  }

  if (session.revokedAt) {
    await prisma.session.updateMany({
      where: {
        tokenFamily: session.tokenFamily,
      },
      data: {
        isCompromised: true,
        revokedAt: new Date(),
        revokedReason: 'Token reuse detected - potential theft',
      },
    });
    throw new UnauthorizedError('Refresh token reuse detected!');
  }

  if (session.isCompromised) {
    throw new UnauthorizedError('Session has been compromised!');
  }

  const isValid = await verifyPassword(
    oldRefreshToken,
    session.refreshTokenHash
  );
  if (!isValid) {
    throw new UnauthorizedError('Invalid refresh token!');
  }

  const validSession = session;

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.sub,
    },
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  const accessToken = generateAccessToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  const newSessionId = randomUUID();

  const newRefreshToken = generateRefreshToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: newSessionId,
    },
    'iam-service',
    'aegis-client'
  );

  const refreshTokenHash = await hashPassword(newRefreshToken);
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction(async (tx) => {
    await tx.session.update({
      where: {
        id: validSession.id,
      },
      data: {
        revokedAt: new Date(Date.now()),
        revokedReason: 'Token rotation',
      },
    });

    await tx.session.create({
      data: {
        id: newSessionId,
        userId: user.id,
        refreshTokenHash: refreshTokenHash,
        tokenFamily: validSession.tokenFamily,
        rotationCount: validSession.rotationCount + 1,
        expiresAt,
        lastUsedAt: new Date(),
        userAgent: validSession.userAgent,
        deviceType: validSession.deviceType,
        deviceName: validSession.deviceName,
        osName: validSession.osName,
        osVersion: validSession.osVersion,
        browserName: validSession.browserName,
        browserVersion: validSession.browserVersion,
        ipAddress: ipAddress || validSession.ipAddress,
      },
    });
  });

  return {
    ...user,
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutService = async (
  userId: string,
  sessionId?: string,
  logoutAll = false
) => {
  if (logoutAll) {
    // Logout from all devices
    await prisma.session.updateMany({
      where: { userId: userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'User logged out from all devices',
      },
    });
  } else {
    // Revoke current session of the user
    await prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'User logged out',
      },
    });
  }
};
