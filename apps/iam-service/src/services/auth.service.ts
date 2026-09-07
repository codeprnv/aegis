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
import { randomBytes, randomUUID } from 'crypto';
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
  const { password, mobile, userAgent, ipAddress } = input;
  const email = input.email.toLowerCase().trim();
  const username = input.username.trim();

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

  // Check if user is already pending in Redis using secondary indexes
  const pendingByEmail = await redis.get(`registration:email:${email}`);
  const pendingByUsername = await redis.get(`registration:username:${username}`);
  
  if (pendingByEmail || pendingByUsername) {
    throw new ConflictError(
      'A user with this email or username is already pending verification. Please check your email.'
    );
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Generate a random verification token and hash it for secure storage
  const rawVerificationToken = randomBytes(32).toString('hex');
  const tokenHash = hashTokenSHA256(rawVerificationToken);

  const pendingUserData = {
    username,
    email,
    passwordHash,
    mobile: mobile || null,
    userAgent,
    ipAddress,
  };

  // Store in Redis with a 24-hour expiration (86400 seconds) using the token hash
  await redis.setex(`registration:${tokenHash}`, 86400, pendingUserData);
  await redis.setex(`registration:email:${email}`, 86400, tokenHash);
  await redis.setex(`registration:username:${username}`, 86400, tokenHash);

  // Enqueue emails asynchronously (don't block the request)
  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    // We only send the Verification Email at this stage with the raw token
    enqueueNotification(NotificationEvent.EMAIL_VERIFICATION_REQUESTED, {
      userId: 'pending',
      email: email,
      username: username,
      verificationToken: rawVerificationToken,
    });
  }).catch((err) => {
    logger.error(err, 'Failed to enqueue registration emails');
  });

  return {
    message: 'Registration accepted. Please check your email to verify your account.',
  };
};

export const verifyEmailService = async (token: string): Promise<AuthResponse> => {
  const tokenHash = hashTokenSHA256(token);
  const redisKey = `registration:${tokenHash}`;
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
  await redis.del(`registration:email:${pendingData.email}`);
  await redis.del(`registration:username:${pendingData.username}`);

  // Welcome email can be sent here if we didn't send it before
  import('@aegis/events').then(({ enqueueNotification, NotificationEvent }) => {
    enqueueNotification(NotificationEvent.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      username: user.username,
    });
  }).catch((err) => {
    logger.error(err, 'Failed to enqueue welcome email');
  });

  return {
    ...user,
    accessToken,
    refreshToken,
    sessionId: sessionId,
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  const { password, userAgent, ipAddress, rememberMe } = input;
  const email = input.email.toLowerCase().trim();

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
      emailVerified: true,
      forcePasswordChange: true,
      passwordHash: true,
    },
  });

  if (!user || !user.passwordHash) {
    await recordFailedAttempt(email, ipAddress);
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.emailVerified) {
    throw new ForbiddenError('Please verify your email address before logging in.');
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

  if (user.forcePasswordChange) {
    return {
      requiresPasswordChange: true,
      message: 'You must change your temporary password before continuing.',
    };
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

  const refreshExpiryDays = rememberMe ? 15 : 1;
  const refreshExpiryStr = `${refreshExpiryDays}d`;
  
  const refreshToken = generateRefreshToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: sessionId,
    },
    'iam-service',
    'aegis-client',
    refreshExpiryStr
  );

  const refreshTokenHash = hashTokenSHA256(refreshToken);
  const expiresAt = new Date(
    Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000
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

    await tx.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
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
  } else if (sessionId) {
    // Revoke current session of the user
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        userId: userId,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'User logged out',
      },
    });
  }
};

export const getMeService = async (userId: string) => {
  const user = await prisma.user
    .update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
      select: {
        id: true,
        username: true,
        email: true,
        mobile: true,
        role: true,
        createdAt: true,
      },
    })
    .catch(() => null);

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  return user;
};
