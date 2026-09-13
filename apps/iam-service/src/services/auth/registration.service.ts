import {
  hashPassword,
  hashTokenSHA256,
  validatePassword,
} from '@aegis/common';
import { prisma, redis } from '@aegis/database';
import { BadRequestError, ConflictError } from '@aegis/middlewares';
import { randomBytes, randomUUID } from 'crypto';
import type { AuthResponse, RegisterInput } from '../../types/auth.types';
import {
  deriveDeviceFingerprint,
  parseDeviceInfo,
} from '../../utils/device-parser.util';
import {
  publishEmailVerificationRequested,
  publishLoginSecurityEvent,
  publishUserRegistered,
} from '../events/auth-events.publisher';
import { issueSessionTokenPair } from './token-issuance.service';

/**
 * Validates registration credentials, checks uniqueness against PostgreSQL and Redis,
 * hashes the password with Argon2id, stages the registration in Redis with a 24h TTL,
 * and dispatches an email verification event.
 *
 * @param input - Registration payload containing credentials and optional telemetry
 * @returns Confirmation message instructing user to verify email
 * @throws {BadRequestError} If password policy validation fails
 * @throws {ConflictError} If email or username is already registered or pending verification
 */
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

  const pendingByEmail = await redis.get(`registration:email:${email}`);
  const pendingByUsername = await redis.get(
    `registration:username:${username}`
  );

  if (pendingByEmail || pendingByUsername) {
    throw new ConflictError(
      'A user with this email or username is already pending verification. Please check your email.'
    );
  }

  const passwordHash = await hashPassword(password);
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

  await redis.setex(`registration:${tokenHash}`, 86400, pendingUserData);
  await redis.setex(`registration:email:${email}`, 86400, tokenHash);
  await redis.setex(`registration:username:${username}`, 86400, tokenHash);

  publishEmailVerificationRequested({
    userId: 'pending',
    email,
    username,
    verificationToken: rawVerificationToken,
  });

  return {
    message:
      'Registration accepted. Please check your email to verify your account.',
  };
};

/**
 * Validates an email verification token, creates the user, password history, and initial
 * session via a single round-trip Prisma nested write, handles concurrent double-clicks safely,
 * cleans up Redis staging keys post-commit, and emits login security telemetry.
 *
 * @param token - Raw hexadecimal verification token provided in the verification link
 * @returns Authenticated user profile and session tokens
 * @throws {BadRequestError} When token is invalid or expired
 */
export const verifyEmailService = async (
  token: string
): Promise<AuthResponse> => {
  const tokenHash = hashTokenSHA256(token);
  const redisKey = `registration:${tokenHash}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pendingData = await redis.get<any>(redisKey);

  if (!pendingData) {
    throw new BadRequestError('Invalid or expired verification token');
  }

  const deviceInfo = parseDeviceInfo(pendingData.userAgent);
  const userId = randomUUID();
  const sessionId = randomUUID();
  const tokenFamilyId = randomUUID();

  const { accessToken, refreshToken, refreshTokenHash, expiresAt } =
    issueSessionTokenPair({
      userId,
      email: pendingData.email,
      role: 'USER',
      sessionId,
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createdUser: any;
  try {
    // Single round-trip nested write optimizing Neon serverless connection usage (ARCH-08)
    createdUser = await prisma.user.create({
      data: {
        id: userId,
        username: pendingData.username,
        email: pendingData.email,
        passwordHash: pendingData.passwordHash,
        mobile: pendingData.mobile || null,
        role: 'USER',
        emailVerified: true,
        emailVerifiedAt: new Date(),
        passwordHistory: {
          create: [
            {
              passwordHash: pendingData.passwordHash,
            },
          ],
        },
        sessions: {
          create: [
            {
              id: sessionId,
              refreshTokenHash,
              expiresAt,
              tokenFamily: tokenFamilyId,
              lastUsedAt: new Date(),
              ipAddress: pendingData.ipAddress,
              userAgent: pendingData.userAgent,
              deviceType: deviceInfo.deviceType || 'desktop',
              deviceName: deviceInfo.deviceName || undefined,
              osName: deviceInfo.osName || undefined,
              osVersion: deviceInfo.osVersion || undefined,
              browserName: deviceInfo.browserName || undefined,
              browserVersion: deviceInfo.browserVersion || undefined,
            },
          ],
        },
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // Graceful double-click and unique constraint race mitigation (SEC-02 Corrected)
    if (error.code === 'P2002') {
      return {
        message: 'Email already verified. You may proceed to log in.',
      };
    }
    throw error;
  }

  // Purge Redis staging keys ONLY AFTER PostgreSQL transaction succeeds (SEC-02)
  await redis.del(
    redisKey,
    `registration:email:${pendingData.email}`,
    `registration:username:${pendingData.username}`
  );

  publishUserRegistered({
    userId: createdUser.id,
    email: createdUser.email,
    username: createdUser.username,
  });

  const deviceFingerprint = deriveDeviceFingerprint(
    pendingData.headers ?? { 'user-agent': pendingData.userAgent }
  );

  publishLoginSecurityEvent({
    eventId: randomUUID(),
    userId: createdUser.id,
    sessionId,
    email: createdUser.email,
    ipAddress: pendingData.ipAddress || '127.0.0.1',
    userAgent: pendingData.userAgent || 'unknown',
    deviceFingerprint,
    timestamp: Date.now(),
  });

  return {
    ...createdUser,
    accessToken,
    refreshToken,
    sessionId,
  };
};
