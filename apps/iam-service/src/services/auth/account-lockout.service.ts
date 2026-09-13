import { logger } from '@aegis/common';
import {
  prisma,
  clearLockout as redisClearLockout,
  getTTL as redisGetTTL,
  incrementWithTTL as redisIncrementWithTTL,
  isLocked as redisIsLocked,
  resetCounter as redisResetCounter,
  setLockout as redisSetLockout,
} from '@aegis/database';
import { IAM_LOCKOUT_CONFIG, REDIS_LOCKOUT_KEYS } from '../../config/index.js';

/**
 * Result structure of an account lockout status inquiry.
 */
export interface AccountLockoutStatus {
  locked: boolean;
  remainingSeconds?: number;
  reason?: string;
}

/**
 * Checks whether an account is currently locked out due to excessive failed attempts.
 * Queries Redis first for edge performance, with PostgreSQL fallback for persistent locks.
 *
 * @param email - User's email identifier
 * @returns Status detailing whether the account is locked and remaining duration
 */
export const isAccountLocked = async (
  email: string
): Promise<AccountLockoutStatus> => {
  const lockKey = REDIS_LOCKOUT_KEYS.ACCOUNT_LOCKOUT(email);

  try {
    const isLockedInRedis = await redisIsLocked(lockKey);

    if (isLockedInRedis) {
      const ttl = await redisGetTTL(lockKey);
      return {
        locked: true,
        remainingSeconds: ttl,
        reason: `Too many failed login attempts. Try again in ${ttl ? Math.ceil(ttl / 60) : 15} minutes`,
      };
    }
  } catch (error) {
    logger.error(error, 'Failed to check Redis for account lockout');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      accountLocked: true,
      lockedUntil: true,
      accountLockedReason: true,
    },
  });

  if (user?.accountLocked) {
    if (user.lockedUntil) {
      if (user.lockedUntil < new Date()) {
        await unlockAccount(email);
        return { locked: false };
      }
    } else {
      return {
        locked: true,
        remainingSeconds: undefined,
        reason: user.accountLockedReason || 'Account permanently locked',
      };
    }

    return {
      locked: true,
      remainingSeconds: user.lockedUntil
        ? Math.floor((user.lockedUntil.getTime() - Date.now()) / 1000)
        : undefined,
      reason: user.accountLockedReason || 'Account locked by admin',
    };
  }

  return { locked: false };
};

/**
 * Locks an account across both Redis (for instant edge enforcement) and PostgreSQL (for persistence).
 *
 * @param email - Target user's email
 * @param reason - Diagnostic reason for account lockout
 */
export const lockAccount = async (
  email: string,
  reason: string
): Promise<void> => {
  const lockKey = REDIS_LOCKOUT_KEYS.ACCOUNT_LOCKOUT(email);
  const lockedUntil = new Date(
    Date.now() + IAM_LOCKOUT_CONFIG.LOCKOUT_DURATION_SECONDS * 1000
  );

  try {
    await redisSetLockout(lockKey, IAM_LOCKOUT_CONFIG.LOCKOUT_DURATION_SECONDS);
  } catch (error) {
    logger.error(
      error,
      'Failed to set Redis lockout, continuing with database'
    );
  }

  await prisma.user.updateMany({
    where: { email },
    data: {
      accountLocked: true,
      lockedUntil,
      accountLockedReason: reason,
      accountLockedAt: new Date(),
      failedLoginAttempts: IAM_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS,
      lastFailedLoginAt: new Date(),
    },
  });

  logger.error(
    {
      email,
      reason,
      lockedUntil,
    },
    'Account locked due to security policy'
  );
};

/**
 * Unlocks an account, resetting Redis counters and clearing database lockout flags.
 *
 * @param email - Target user's email
 */
export const unlockAccount = async (email: string): Promise<void> => {
  const attemptKey = REDIS_LOCKOUT_KEYS.FAILED_ATTEMPTS(email);
  const lockKey = REDIS_LOCKOUT_KEYS.ACCOUNT_LOCKOUT(email);

  await Promise.all([
    redisResetCounter(attemptKey),
    redisClearLockout(lockKey),
  ]);

  await prisma.user.updateMany({
    where: { email },
    data: {
      accountLocked: false,
      lockedUntil: null,
      accountLockedReason: null,
      accountLockedAt: null,
      failedLoginAttempts: 0,
      lastFailedLoginAt: null,
    },
  });

  logger.info({ email }, 'Account unlocked');
};

/**
 * Increments failed authentication attempts in Redis within a rolling window.
 * Triggers account lockout if the configured failure threshold is breached.
 *
 * @param email - Candidate email attempted
 * @param ipAddress - Client IP address of the failed attempt
 * @returns Status indicating whether account was locked and attempts remaining
 */
export const recordFailedAttempt = async (
  email: string,
  ipAddress?: string
): Promise<{
  shouldLock: boolean;
  attemptRemaining: number;
}> => {
  const attemptKey = REDIS_LOCKOUT_KEYS.FAILED_ATTEMPTS(email);

  const attemptCount = await redisIncrementWithTTL(
    attemptKey,
    IAM_LOCKOUT_CONFIG.ATTEMPT_WINDOW_SECONDS
  );

  logger.warn({
    message: 'Failed login attempt',
    email,
    ipAddress,
    attemptCount,
    threshold: IAM_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS,
  });

  if (attemptCount >= IAM_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
    await lockAccount(email, 'Too many failed login attempts!');
    return {
      shouldLock: true,
      attemptRemaining: 0,
    };
  }

  return {
    shouldLock: false,
    attemptRemaining: IAM_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - attemptCount,
  };
};

/**
 * Resets failed attempts upon successful login and updates the user's active timestamps.
 *
 * @param email - Authenticated user's email
 */
export const recordSuccessfulLogin = async (email: string): Promise<void> => {
  await unlockAccount(email);

  await prisma.user.update({
    where: { email },
    data: {
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
    },
  });
};
