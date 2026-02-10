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
import { UAParser } from 'ua-parser-js';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
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
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ConflictError('A user with this email already exists');
    }
    throw new ConflictError('A user with this username already exists');
  }

  // Hash the password
  const passwordHash = await hashPassword(password);

  // Create the user and session transactionally
  const {
    user: createdUser,
    accessToken,
    refreshToken,
  } = await prisma.$transaction(async (tx) => {
    // Create the user
    const user = await tx.user.create({
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
        userId: user.id,
        passwordHash: passwordHash,
      },
    });

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
      },
      'iam-service',
      'aegis-client'
    );

    const refreshTokenHash = await hashPassword(refreshToken); // reuse the hash password util for hashing refresh token
    const expiresAt = new Date(
      Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );
    const parser = new UAParser(userAgent || '');
    const result = parser.getResult();

    // Create Session in database
    await tx.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshTokenHash,
        expiresAt: expiresAt,
        lastUsedAt: new Date(),
        userAgent,
        ipAddress,
        deviceType: result.device.type || 'desktop',
        deviceName: result.device.model || undefined,
        osName: result.os.name || undefined,
        osVersion: result.os.version || undefined,
        browserName: result.browser.name || undefined,
        browserVersion: result.browser.version || undefined,
      },
    });

    return { user, accessToken, refreshToken };
  });

  return {
    ...createdUser,
    accessToken,
    refreshToken,
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  const { email, password, userAgent, ipAddress } = input;

  const { locked, reason } = await isAccountLocked(email);
  if (locked) {
    throw new ForbiddenError(reason || 'Account is locked!');
  }

  const user = await prisma.user.findFirst({
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
      throw new ForbiddenError(
        'Account locked due to too many failed login attempts. Try again in 15 minutes!'
      );
    }
    throw new UnauthorizedError(
      `Invalid email or password. ${attemptRemaining} attempt(s) remaining before account lockout!`
    );
  }

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
    },
    'iam-service',
    'aegis-client'
  );

  const refreshTokenHash = await hashPassword(refreshToken); // reuse the hash password util for hashing refresh token
  const expiresAt = new Date(
    Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );
  const parser = new UAParser(userAgent || '');
  const result = parser.getResult();

  // Create Session in database
  await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshTokenHash,
      expiresAt: expiresAt,
      lastUsedAt: new Date(),
      userAgent,
      ipAddress,
      deviceType: result.device.type || 'desktop',
      deviceName: result.device.model || undefined,
      osName: result.os.name || undefined,
      osVersion: result.os.version || undefined,
      browserName: result.browser.name || undefined,
      browserVersion: result.browser.version || undefined,
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    accessToken,
    refreshToken,
  };
};

export const refreshTokenService = async (
  oldRefreshToken: string
): Promise<AuthResponse> => {
  // Verify token
  const decoded = verifyRefreshToken(oldRefreshToken);

  // Find the current active sessions of the user
  const sessions = await prisma.session.findMany({
    where: {
      userId: decoded.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  let validSession = null;
  for (const session of sessions) {
    const isValid = await verifyPassword(
      oldRefreshToken,
      session.refreshTokenHash
    );
    if (isValid) {
      validSession = session;
      break;
    }
  }

  // If no valid session is found, the token is already used or revoked
  if (!validSession) {
    const anySession = sessions[0];
    if (anySession) {
      await prisma.session.updateMany({
        where: {
          tokenFamily: anySession.tokenFamily,
        },
        data: {
          isCompromised: true,
          revokedAt: new Date(Date.now()),
          revokedReason: 'Token reuse detected - potential theft',
        },
      });
    }
    throw new UnauthorizedError('Invalid or expired refresh token!');
  }

  if (validSession.isCompromised) {
    throw new UnauthorizedError('Session has been compromised!');
  }

  // Get the user
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

  // Generate access token and refresh token
  const accessToken = generateAccessToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  const newRefreshToken = generateRefreshToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    'iam-service',
    'aegis-client'
  );

  // Perform token rotation and session update in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Revoke old session
    await tx.session.update({
      where: {
        id: validSession.id,
      },
      data: {
        revokedAt: new Date(Date.now()),
        revokedReason: 'Token rotation',
      },
    });

    // Create new session
    const refreshTokenHash = await hashPassword(newRefreshToken);
    const expiresAt = new Date(
      Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    await tx.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshTokenHash,
        tokenFamily: validSession.tokenFamily,
        rotationCount: validSession.rotationCount + 1,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    return { accessToken, refreshToken: newRefreshToken };
  });

  return {
    ...user,
    ...result,
  };
};

export const logoutService = async (userId: string) => {
  // Revoke all active sessions of the user
  await prisma.session.updateMany({
    where: {
      userId: userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: 'User logged out',
    },
  });
};

export const resetPasswordService = async (data: ResetPasswordInput) => {
  // Find the user if exists
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { mobile: data?.mobile },
        { username: data?.username },
      ],
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    throw new BadRequestError('Invalid credentials!');
  }

  // Validate the new password against password policy
  const validationResult = validatePassword(data.newPassword);
  if (!validationResult.success) {
    throw new BadRequestError(validationResult.error || 'Invalid password!');
  }

  // Hash the new password
  const newPasswordHash = await hashPassword(data.newPassword);

  // Check if the new password hash exists in password history (limit to last 5)
  const passwords = await prisma.passwordHistory.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      changedAt: 'desc',
    },
    take: 5,
    select: {
      passwordHash: true,
    },
  });

  for (const password of passwords) {
    const isMatch = await verifyPassword(
      data.newPassword,
      password.passwordHash
    );

    if (isMatch) {
      throw new ForbiddenError('You cannot use your previous password!');
    }
  }

  // TODO: Call the OTP Service to verify the OTP

  // Update the password and history transactionally
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: {
        email: user.email,
      },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    await tx.passwordHistory.create({
      data: {
        userId: user.id,
        passwordHash: newPasswordHash,
        changedAt: new Date(Date.now()),
      },
    });
  });

  return {
    success: true,
    message: 'Password changed successfully!',
  };
};
