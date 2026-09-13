import { logger } from '@aegis/common';
import { prisma } from '@aegis/database';
import { UnauthorizedError } from '@aegis/middlewares';

/**
 * Public user profile representation excluding internal authentication metadata.
 */
export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  mobile: string | null;
  role: string;
  createdAt: Date;
}

/**
 * Threshold interval for debouncing lastActiveAt database writes.
 * 5 minutes (300,000 milliseconds) suppresses Neon connection exhaustion on read bursts.
 */
const LAST_ACTIVE_DEBOUNCE_MS = 5 * 60 * 1000;

/**
 * Retrieves the authenticated user's profile and updates the activity telemetry
 * using a time-debounced write to eliminate serverless database write amplification.
 *
 * @param userId - Unique identifier of the authenticated user
 * @returns Public user profile information
 * @throws {UnauthorizedError} When user cannot be resolved in PostgreSQL
 */
export const getMeService = async (
  userId: string
): Promise<UserProfileResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      mobile: true,
      role: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found!');
  }

  const now = Date.now();
  const shouldUpdateActivity =
    !user.lastActiveAt ||
    now - user.lastActiveAt.getTime() > LAST_ACTIVE_DEBOUNCE_MS;

  if (shouldUpdateActivity) {
    prisma.user
      .update({
        where: { id: userId },
        data: { lastActiveAt: new Date(now) },
      })
      .catch((err: Error) => {
        logger.warn(
          {
            error: err.message,
            userId,
          },
          'Non-blocking debounced lastActiveAt update failed'
        );
      });
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    createdAt: user.createdAt,
  };
};
