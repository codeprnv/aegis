import { verifyRefreshToken } from '@aegis/auth';
import { hashTokenSHA256 } from '@aegis/common';
import { prisma, redis } from '@aegis/database';
import { UnauthorizedError } from '@aegis/middlewares';
import { randomUUID } from 'crypto';
import type { AuthResponse } from '../../types/auth.types';
import { createSessionRecord } from '../session/session-management.service';
import { issueSessionTokenPair } from './token-issuance.service';

/**
 * Maximum absolute lifespan of any session family (30 days in milliseconds).
 * Enforces session expiration regardless of active rotation frequency (SEC-08).
 */
const ABSOLUTE_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Edge blocklist time-to-live in seconds (15-minute access token + 60s skew buffer).
 */
const EDGE_REVOCATION_TTL_SECONDS = 960;

/**
 * Idempotent grace-period cache window in seconds.
 * Absorbs concurrent network race conditions without session branching (SEC-04).
 */
const REFRESH_GRACE_PERIOD_SECONDS = 15;

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
  const graceCacheKey = `aegis:refresh:cache:${oldTokenHash}`;

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
    `aegis:revoked:session:${session.id}`
  );

  if (session.revokedAt || isRevokedInCache) {
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
    await redis.setex(
      `aegis:revoked:session:${session.id}`,
      EDGE_REVOCATION_TTL_SECONDS,
      'revoked'
    );
    throw new UnauthorizedError('Refresh token reuse detected!');
  }

  if (session.isCompromised) {
    throw new UnauthorizedError('Session has been compromised!');
  }

  // Absolute session family lifetime cap (SEC-08)
  const sessionAgeMs = Date.now() - session.createdAt.getTime();
  if (sessionAgeMs > ABSOLUTE_SESSION_MAX_AGE_MS) {
    await prisma.session.updateMany({
      where: { tokenFamily: session.tokenFamily },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Session reached absolute 30-day lifetime cap',
      },
    });
    await redis.setex(
      `aegis:revoked:session:${session.id}`,
      EDGE_REVOCATION_TTL_SECONDS,
      'revoked'
    );
    throw new UnauthorizedError('Session expired. Please log in again.');
  }

  const isValid = oldTokenHash === session.refreshTokenHash;
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
    const updateResult = await tx.session.updateMany({
      where: {
        id: validSession.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Token rotation',
      },
    });

    if (updateResult.count === 0) {
      // Race condition caught: another concurrent request already revoked this session
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
    });
  });

  // Explicit stateless edge Redis blocklist write for old rotated session (SEC-01)
  await redis.setex(
    `aegis:revoked:session:${validSession.id}`,
    EDGE_REVOCATION_TTL_SECONDS,
    'revoked'
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
    REFRESH_GRACE_PERIOD_SECONDS,
    JSON.stringify(responsePayload)
  );

  return responsePayload;
};
