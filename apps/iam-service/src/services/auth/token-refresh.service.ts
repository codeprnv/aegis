import {
  EDGE_REVOCATION_TTL_SECONDS,
  REDIS_AUTH_KEYS,
  REDIS_REVOKED_SENTINEL,
  verifyRefreshToken,
} from '@aegis/auth';
import { hashTokenSHA256, timingSafeHashEqual } from '@aegis/common';
import { prisma, redis } from '@aegis/database';
import { UnauthorizedError } from '@aegis/middlewares';
import { randomUUID } from 'crypto';
import {
  IAM_SESSION_CONFIG,
  IAM_TRANSACTION_OPTIONS,
  REDIS_SESSION_KEYS,
  SESSION_REVOCATION_REASONS,
} from '../../config/index.js';
import type { AuthResponse } from '../../types/auth.types';
import { createSessionRecord } from '../session/session-management.service';
import { issueSessionTokenPair } from './token-issuance.service';

/**
 * Validates a refresh token, performs token family reuse detection, enforces
 * absolute session lifetime limits, rotates credentials transactionally,
 * publishes edge revocation entries, and handles concurrent refreshes idempotently.
 *
 * @param oldRefreshToken - Refresh token presented by the client
 * @param ipAddress - Optional client IP address making the rotation request
 * @returns Fresh user profile and rotated token pair
 * @throws {UnauthorizedError} If token is invalid, expired, revoked, or compromised
 */
export const refreshTokenService = async (
  oldRefreshToken: string,
  ipAddress?: string
): Promise<AuthResponse> => {
  const oldTokenHash = hashTokenSHA256(oldRefreshToken);
  const graceCacheKey = REDIS_SESSION_KEYS.REFRESH_CACHE(oldTokenHash);

  // Idempotent grace period check: return cached token pair for concurrent calls (SEC-04)
  const cachedTokens = await redis.get<string>(graceCacheKey);
  if (cachedTokens) {
    try {
      return typeof cachedTokens === 'string'
        ? JSON.parse(cachedTokens)
        : cachedTokens;
    } catch {
      // Fall through to standard rotation if cache deserialization fails
    }
  }

  const decoded = verifyRefreshToken(oldRefreshToken);

  const session = await prisma.session.findUnique({
    where: {
      id: decoded.sessionId,
    },
  });

  if (!session) {
    throw new UnauthorizedError('Session not found or expired!');
  }

  // Refresh Token Race Guard: Check edge Redis blocklist before issuing new tokens
  const isRevokedInCache = await redis.get(
    REDIS_AUTH_KEYS.REVOKED_SESSION(session.id)
  );

  if (session.revokedAt || isRevokedInCache) {
    await prisma.session.updateMany({
      where: {
        tokenFamily: session.tokenFamily,
      },
      data: {
        isCompromised: true,
        revokedAt: new Date(),
        revokedReason: SESSION_REVOCATION_REASONS.TOKEN_REUSE_DETECTED,
      },
    });
    await redis.setex(
      REDIS_AUTH_KEYS.REVOKED_SESSION(session.id),
      EDGE_REVOCATION_TTL_SECONDS,
      REDIS_REVOKED_SENTINEL
    );
    throw new UnauthorizedError('Refresh token reuse detected!');
  }

  if (session.isCompromised) {
    throw new UnauthorizedError('Session has been compromised!');
  }

  // Absolute session family lifetime cap (SEC-08)
  const familyCreatedAt = (session as any).familyCreatedAt || session.createdAt;
  const sessionAgeMs = Date.now() - familyCreatedAt.getTime();
  if (sessionAgeMs > IAM_SESSION_CONFIG.ABSOLUTE_SESSION_MAX_AGE_MS) {
    await prisma.session.updateMany({
      where: { tokenFamily: session.tokenFamily },
      data: {
        revokedAt: new Date(),
        revokedReason: SESSION_REVOCATION_REASONS.ABSOLUTE_LIFETIME_CAP,
      },
    });
    await redis.setex(
      REDIS_AUTH_KEYS.REVOKED_SESSION(session.id),
      EDGE_REVOCATION_TTL_SECONDS,
      REDIS_REVOKED_SENTINEL
    );
    throw new UnauthorizedError('Session expired. Please log in again.');
  }

  const isValid = timingSafeHashEqual(oldTokenHash, session.refreshTokenHash);
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
      accountLocked: true,
      deletedAt: true,
    },
  });

  if (!user || user.accountLocked || user.deletedAt) {
    // Revoke the entire session family
    await prisma.session.updateMany({
      where: { tokenFamily: validSession.tokenFamily },
      data: {
        revokedAt: new Date(),
        revokedReason: `ACCOUNT_LOCKED_OR_DELETED`,
      },
    });
    throw new UnauthorizedError(
      `Account is locked or suspended. Please contact support`
    );
  }

  const newSessionId = randomUUID();

  // Centralized token engine minting rotated credentials
  const {
    accessToken,
    refreshToken: newRefreshToken,
    refreshTokenHash,
    expiresAt,
  } = issueSessionTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: newSessionId,
  });

  await prisma.$transaction(async (tx) => {
    // Lock user row first to prevent deadlock with login.service.ts

    await tx.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const updateResult = await tx.session.updateMany({
      where: {
        id: validSession.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: SESSION_REVOCATION_REASONS.TOKEN_ROTATION,
      },
    });

    if (updateResult.count === 0) {
      // Race condition caught: another concurrent request already revoked this session
      await tx.session.updateMany({
        where: { tokenFamily: validSession.tokenFamily },
        data: {
          isCompromised: true,
          revokedAt: new Date(),
          revokedReason: SESSION_REVOCATION_REASONS.TOKEN_REUSE_DETECTED,
        },
      });
      throw new UnauthorizedError('Refresh token reuse detected!');
    }

    // Create rotated session record in database
    await createSessionRecord(tx, {
      sessionId: newSessionId,
      userId: user.id,
      refreshTokenHash,
      tokenFamily: validSession.tokenFamily,
      rotationCount: validSession.rotationCount + 1,
      expiresAt,
      ipAddress: ipAddress || validSession.ipAddress || undefined,
      userAgent: validSession.userAgent || undefined,
      deviceType: validSession.deviceType || undefined,
      deviceName: validSession.deviceName || undefined,
      osName: validSession.osName || undefined,
      osVersion: validSession.osVersion || undefined,
      browserName: validSession.browserName || undefined,
      browserVersion: validSession.browserVersion || undefined,
      familyCreatedAt: (validSession as any).familyCreatedAt || validSession.createdAt,
    });
  }, IAM_TRANSACTION_OPTIONS);

  // Explicit stateless edge Redis blocklist write for old rotated session (SEC-01)
  await redis.setex(
    REDIS_AUTH_KEYS.REVOKED_SESSION(validSession.id),
    EDGE_REVOCATION_TTL_SECONDS,
    REDIS_REVOKED_SENTINEL
  );

  const responsePayload: AuthResponse = {
    ...user,
    accessToken,
    refreshToken: newRefreshToken,
    sessionId: newSessionId,
  };

  // Cache response for idempotent grace period handling (SEC-04)
  await redis.setex(
    graceCacheKey,
    IAM_SESSION_CONFIG.REFRESH_GRACE_PERIOD_SECONDS,
    JSON.stringify(responsePayload)
  );

  return responsePayload;
};
