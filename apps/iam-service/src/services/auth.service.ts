import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@aegis/auth';
import {
  AUTH_CONFIG,
  hashPassword,
  hashTokenSHA256,
  validatePassword,
  verifyPassword,
} from '@aegis/common';
import { prisma, redis } from '@aegis/database';
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

  // Check if user already exists in DB
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

  // Check if user is already pending in Redis
  const pendingKeys = await redis.keys('registration:*');
  for (const key of pendingKeys) {
    const pendingData = await redis.get<any>(key);
    if (pendingData && (pendingData.email === email || pendingData.username === username)) {
      throw new ConflictError(
        'A user with this email or username is already pending verification. Please check your email.'
      );
    }
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Generate a verification token
  const emailVerificationToken = randomUUID();

  const pendingUserData = {
    username,
    email,
    passwordHash,
    mobile: mobile || null,
    userAgent,
    ipAddress,
  };

  // Store in Redis with a 24-hour expiration (86400 seconds)
  await redis.setex(`registration:${emailVerificationToken}`, 86400, pendingUserData);

  // Enqueue emails asynchronously (don't block the request)
  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    // We only send the Verification Email at this stage
    enqueueNotification(NotificationEvent.EMAIL_VERIFICATION_REQUESTED, {
      userId: 'pending',
      email: email,
      username: username,
      verificationToken: emailVerificationToken,
    });
  }).catch((err) => {
    console.error('Failed to enqueue registration emails', err);
  });

  return {
    message: 'Registration accepted. Please check your email to verify your account.',
  };
};

export const verifyEmailService = async (token: string): Promise<AuthResponse> => {
  const redisKey = `registration:${token}`;
  const pendingData = await redis.get<any>(redisKey);

  if (!pendingData) {
    throw new BadRequestError('Invalid or expired verification token');
  }

  // Parse user agent
  const parser = new UAParser(pendingData.userAgent || '');
  const deviceInfo = parser.getResult();

  // Generate IDs
  const userId = randomUUID();
  const sessionId = randomUUID();
  const tokenFamilyId = randomUUID();

  // Pre-generate tokens to allow fast hash outside of transaction
  const accessToken = generateAccessToken(
    {
      sub: userId,
      email: pendingData.email,
      role: 'USER',
    },
    'iam-service',
    'aegis-client'
  );

  const refreshToken = generateRefreshToken(
    {
      sub: userId,
      email: pendingData.email,
      role: 'USER',
      sessionId: sessionId,
    },
    'iam-service',
    'aegis-client'
  );

  // Hash the refresh token using fast SHA-256
  const refreshTokenHash = hashTokenSHA256(refreshToken);

  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Create the user and session transactionally
  const user = await prisma.$transaction(
    async (tx) => {
      // Create the user
      const createdUser = await tx.user.create({
        data: {
          id: userId,
          username: pendingData.username,
          email: pendingData.email,
          passwordHash: pendingData.passwordHash,
          mobile: pendingData.mobile || null,
          role: 'USER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
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
          passwordHash: pendingData.passwordHash,
        },
      });

      // Create the session
      await tx.session.create({
        data: {
          id: sessionId,
          userId: createdUser.id,
          refreshTokenHash: refreshTokenHash,
          expiresAt: expiresAt,
          lastUsedAt: new Date(),
          userAgent: pendingData.userAgent,
          ipAddress: pendingData.ipAddress,
          deviceType: deviceInfo.device.type || 'desktop',
          deviceName: deviceInfo.device.model || undefined,
          osName: deviceInfo.os.name || undefined,
          osVersion: deviceInfo.os.version || undefined,
          browserName: deviceInfo.browser.name || undefined,
          browserVersion: deviceInfo.browser.version || undefined,
          tokenFamily: tokenFamilyId,
        },
      });

      return createdUser;
    },
    {
      maxWait: AUTH_CONFIG.MAX_TRANSACTION_WAIT,
      timeout: AUTH_CONFIG.TRANSACTION_TIMEOUT,
    }
  );

  // Delete the pending registration from Redis
  await redis.del(redisKey);

  // Welcome email can be sent here if we didn't send it before
  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    enqueueNotification(NotificationEvent.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      username: user.username,
    });
  }).catch((err) => {
    console.error('Failed to enqueue welcome email', err);
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

  const refreshTokenHash = hashTokenSHA256(refreshToken);
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Execute login transactionally
  await prisma.$transaction(async (tx) => {
    // Record login
    await tx.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Create Session in database
    await tx.session.create({
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

  const isValid = hashTokenSHA256(oldRefreshToken) === session.refreshTokenHash;
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

  const refreshTokenHash = hashTokenSHA256(newRefreshToken);
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.session.updateMany({
      where: {
        id: validSession.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(Date.now()),
        revokedReason: 'Token rotation',
      },
    });

    if (updateResult.count === 0) {
      // Race condition caught! Another concurrent request already revoked it.
      await tx.session.updateMany({
        where: { tokenFamily: validSession.tokenFamily },
        data: {
          isCompromised: true,
          revokedAt: new Date(),
          revokedReason: 'Token reuse detected - potential theft',
        },
      });
      throw new UnauthorizedError('Refresh token reuse detected!');
    }

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
  } else if (sessionId) {
    // Revoke current session of the user
    await prisma.session.updateMany({
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

export const getMeService = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  return user;
};
