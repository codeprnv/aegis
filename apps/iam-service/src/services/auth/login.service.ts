import { hashTokenSHA256, verifyPassword } from '@aegis/common';
import { prisma } from '@aegis/database';
import { ForbiddenError, UnauthorizedError } from '@aegis/middlewares';
import { randomUUID } from 'crypto';
import type { AuthResponse, LoginInput } from '../../types/auth.types';
import {
  deriveDeviceFingerprint,
  parseDeviceInfo,
} from '../../utils/device-parser.util';
import { publishLoginSecurityEvent } from '../events/auth-events.publisher';
import { createSessionRecord } from '../session/session-management.service';
import {
  isAccountLocked,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from './account-lockout.service';
import {
  issueRestrictedToken,
  issueSessionTokenPair,
} from './token-issuance.service';

/**
 * Pre-computed static Argon2id hash used to perform constant-time dummy verifications
 * for non-existent users, eliminating user-enumeration timing side-channels (SEC-06).
 */
const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dHVtbXlzYWx0MTIzNDU2$O6bN61VdE5dJz8uUv4bS4A';

/**
 * Authenticates user credentials, enforces pre-auth account lockout, applies constant-time
 * timing defenses, captures multi-factor salted device fingerprints, issues session tokens,
 * and publishes security audit telemetry with emission timestamps.
 *
 * @param input - Login credentials, device telemetry, and optional rememberMe flag
 * @returns Authenticated user profile and session tokens
 * @throws {ForbiddenError} If account is locked or email is unverified
 * @throws {UnauthorizedError} If credentials are invalid
 */
export const loginUser = async (input: LoginInput): Promise<AuthResponse> => {
  const { password, userAgent, ipAddress, rememberMe } = input;
  const email = input.email.toLowerCase().trim();

  // Pre-authentication defense: Evaluate edge and persistent lockout state
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

  // Constant-time timing protection against user enumeration attacks (SEC-06)
  if (!user || !user.passwordHash) {
    await verifyPassword(password, DUMMY_ARGON2_HASH).catch(() => false);
    await recordFailedAttempt(email, ipAddress);
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.emailVerified) {
    throw new ForbiddenError(
      'Please verify your email address before logging in.'
    );
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    const { shouldLock, attemptRemaining } = await recordFailedAttempt(
      email,
      ipAddress
    );
    if (shouldLock) {
      throw new ForbiddenError('Account temporarily locked, Try again later!');
    }
    throw new UnauthorizedError(
      `Invalid email or password. ${attemptRemaining} attempt(s) remaining before account lockout!`
    );
  }

  // Scoped token intercept for forced password change workflows (SEC-05)
  if (user.forcePasswordChange) {
    const temporaryToken = issueRestrictedToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      requiresPasswordChange: true,
      message: 'You must change your temporary password before continuing.',
      accessToken: temporaryToken,
    };
  }

  const deviceInfo = parseDeviceInfo(userAgent);
  const sessionId = randomUUID();
  const tokenFamilyId = randomUUID();

  await recordSuccessfulLogin(email);

  // Centralized token engine minting access and refresh tokens
  const { accessToken, refreshToken, refreshTokenHash, expiresAt } =
    issueSessionTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId,
      rememberMe,
    });

  // Execute login and session persistence transactionally
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await createSessionRecord(tx, {
      sessionId,
      userId: user.id,
      refreshTokenHash,
      expiresAt,
      tokenFamily: tokenFamilyId,
      ipAddress,
      userAgent,
      deviceType: deviceInfo.deviceType,
      deviceName: deviceInfo.deviceName,
      osName: deviceInfo.osName,
      osVersion: deviceInfo.osVersion,
      browserName: deviceInfo.browserName,
      browserVersion: deviceInfo.browserVersion,
    });
  });

  // Multi-factor fingerprint salting to prevent WebKit/Gecko entropy starvation (SEC-03)
  const serverFingerprint = deriveDeviceFingerprint(
    input.headers ?? { 'user-agent': userAgent }
  );
  const clientDeviceInstanceId =
    input.deviceFingerprint ||
    (input.headers && typeof input.headers['x-device-instance-id'] === 'string'
      ? input.headers['x-device-instance-id']
      : undefined);

  const effectiveFingerprint = clientDeviceInstanceId
    ? hashTokenSHA256(`${serverFingerprint}|${clientDeviceInstanceId}`)
    : serverFingerprint;

  // Dispatch security telemetry stamped with emission timestamp to prevent velocity dilution (SEC-12)
  publishLoginSecurityEvent({
    eventId: randomUUID(),
    userId: user.id,
    sessionId,
    email: user.email,
    ipAddress: ipAddress || '127.0.0.1',
    userAgent: userAgent || 'unknown',
    deviceFingerprint: effectiveFingerprint,
    timestamp: Date.now(),
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;

  return {
    ...userWithoutPassword,
    accessToken,
    refreshToken,
    sessionId,
  };
};
