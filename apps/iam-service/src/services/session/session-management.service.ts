import { prisma, redis } from '@aegis/database';
import { NotFoundError, UnauthorizedError } from '@aegis/middlewares';

/**
 * Data transfer object representing an active session returned to the client.
 */
export interface SessionDto {
  id: string;
  deviceType: string | null;
  deviceName: string | null;
  osName: string | null;
  osVersion: string | null;
  browserName: string | null;
  browserVersion: string | null;
  ipAddress: string | null;
  lastUsedAt: Date;
  createdAt: Date;
  isCurrent: boolean;
}

/**
 * Parameters for persisting a newly authenticated or rotated session in PostgreSQL.
 */
export interface CreateSessionOptions {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  tokenFamily: string;
  rotationCount?: number;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  deviceName?: string;
  osName?: string;
  osVersion?: string;
  browserName?: string;
  browserVersion?: string;
}

/**
 * Edge blocklist time-to-live in seconds (15-minute access token lifespan + 60s clock skew buffer).
 */
const EDGE_REVOCATION_TTL_SECONDS = 960;

/**
 * Transactional helper for creating an active session record in PostgreSQL.
 *
 * @param tx - Active Prisma transaction client or base Prisma client
 * @param options - Session creation parameters
 * @returns The created session record
 */
export const createSessionRecord = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  options: CreateSessionOptions
) => {
  return tx.session.create({
    data: {
      id: options.sessionId,
      userId: options.userId,
      refreshTokenHash: options.refreshTokenHash,
      expiresAt: options.expiresAt,
      lastUsedAt: new Date(),
      userAgent: options.userAgent,
      ipAddress: options.ipAddress,
      deviceType: options.deviceType || 'desktop',
      deviceName: options.deviceName || undefined,
      osName: options.osName || undefined,
      osVersion: options.osVersion || undefined,
      browserName: options.browserName || undefined,
      browserVersion: options.browserVersion || undefined,
      tokenFamily: options.tokenFamily,
      rotationCount: options.rotationCount ?? 0,
    },
  });
};

/**
 * Retrieves all active, unexpired sessions for a user, flagging the current session.
 *
 * @param userId - Unique identifier of the authenticated user
 * @param currentSessionId - Optional session ID extracted from the authenticated internal token
 * @returns Array of active session representations
 */
export const listUserSessions = async (
  userId: string,
  currentSessionId?: string
): Promise<SessionDto[]> => {
  const sessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true,
      deviceType: true,
      deviceName: true,
      osName: true,
      osVersion: true,
      browserName: true,
      browserVersion: true,
      ipAddress: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return sessions.map((session) => ({
    ...session,
    isCurrent: Boolean(currentSessionId && session.id === currentSessionId),
  }));
};

/**
 * Revokes a single session belonging to the user and writes to the edge Redis blocklist.
 *
 * @param userId - Unique identifier of the requesting user
 * @param sessionId - Unique identifier of the session to terminate
 * @throws {NotFoundError} If the session does not exist or does not belong to the user
 */
export const revokeSession = async (
  userId: string,
  sessionId: string
): Promise<void> => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, revokedAt: true },
  });

  if (!session || session.userId !== userId) {
    throw new NotFoundError('Session not found or unauthorized');
  }

  if (!session.revokedAt) {
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: 'Manual user revocation',
      },
    });
  }

  await redis.setex(
    `aegis:revoked:session:${sessionId}`,
    EDGE_REVOCATION_TTL_SECONDS,
    'revoked'
  );
};

/**
 * Revokes all active sessions for a user except the current session, executing
 * pipelined Redis blocklist writes in a single round-trip.
 *
 * @param userId - Unique identifier of the requesting user
 * @param currentSessionId - Current session ID to preserve
 * @returns Number of sessions revoked
 * @throws {UnauthorizedError} If current session identifier is missing
 */
export const revokeAllOtherSessions = async (
  userId: string,
  currentSessionId: string
): Promise<number> => {
  if (!currentSessionId) {
    throw new UnauthorizedError(
      'Current session identifier required to preserve active session'
    );
  }

  const otherSessions = await prisma.session.findMany({
    where: {
      userId,
      revokedAt: null,
      id: { not: currentSessionId },
    },
    select: { id: true },
  });

  if (otherSessions.length === 0) {
    return 0;
  }

  const sessionIds = otherSessions.map((s) => s.id);

  await prisma.session.updateMany({
    where: {
      id: { in: sessionIds },
      userId,
    },
    data: {
      revokedAt: new Date(),
      revokedReason: 'Revoke all other sessions',
    },
  });

  const pipeline = redis.pipeline();
  for (const id of sessionIds) {
    const key = `aegis:revoked:session:${id}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (pipeline as any).setex === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pipeline as any).setex(key, EDGE_REVOCATION_TTL_SECONDS, 'revoked');
    } else {
      pipeline.set(key, 'revoked', { ex: EDGE_REVOCATION_TTL_SECONDS });
    }
  }

  await pipeline.exec();

  return sessionIds.length;
};

/**
 * Terminates user sessions on logout, universally synchronizing PostgreSQL state
 * with the Redis edge blocklist. Absorbed from auth.service.ts to unify session lifecycles.
 *
 * @param userId - Unique identifier of the authenticated user
 * @param sessionId - Optional identifier of the specific session to terminate
 * @param logoutAll - If true, terminates all active sessions associated with the user
 */
export const logoutService = async (
  userId: string,
  sessionId?: string,
  logoutAll = false
): Promise<void> => {
  if (logoutAll) {
    const activeSessions = await prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { id: true },
    });

    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: {
        revokedAt: new Date(),
        revokedReason: 'User logged out from all devices',
      },
    });

    if (activeSessions.length > 0) {
      const pipeline = redis.pipeline();
      for (const session of activeSessions) {
        const key = `aegis:revoked:session:${session.id}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (pipeline as any).setex === 'function') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (pipeline as any).setex(key, EDGE_REVOCATION_TTL_SECONDS, 'revoked');
        } else {
          pipeline.set(key, 'revoked', { ex: EDGE_REVOCATION_TTL_SECONDS });
        }
      }
      await pipeline.exec();
    }
  } else if (sessionId) {
    await prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: 'User logged out',
      },
    });

    await redis.setex(
      `aegis:revoked:session:${sessionId}`,
      EDGE_REVOCATION_TTL_SECONDS,
      'revoked'
    );
  }
};
