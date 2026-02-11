import { AUTH_CONFIG, logger, REDIS_KEYS } from '@aegis/common';
import { prisma, RedisHelper } from '@aegis/database';

const redisHelper = new RedisHelper();

export const isAccountLocked = async (
  email: string
): Promise<{
  locked: boolean;
  remainingSeconds?: number;
  reason?: string;
}> => {
  const lockKey = REDIS_KEYS.ACCOUNT_LOCKOUT(email);

  // Check redis first
  try {
    const isLockedInRedis = await redisHelper.isLocked(lockKey);

    if (isLockedInRedis) {
      const ttl = await redisHelper.getTTL(lockKey);
      return {
        locked: true,
        remainingSeconds: ttl,
        reason: `Too many failed login attempts. Try again in ${ttl ? Math.ceil(ttl / 60) : 15} minutes`,
      };
    }
  } catch (error) {
    logger.error(error, 'Failed to check Redis for account lockout');
  }

  // Fallback:Check database
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      accountLocked: true,
      lockedUntil: true,
      accountLockedReason: true,
    },
  });

  if (user?.accountLocked) {
    // Check if lock has expiration and is expired
    if (user.lockedUntil) {
      if (user.lockedUntil < new Date()) {
        //  Lock expired - unlock the user account
        await unlockAccount(email);
        return { locked: false };
      }
    } else {
      // No expiration data - permanently locked
      return {
        locked: true,
        remainingSeconds: undefined,
        reason: user.accountLockedReason || 'Account permanently locked',
      };
    }
    // Lock still active with time remaining
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

export const lockAccount = async (
  email: string,
  reason: string
): Promise<void> => {
  const lockKey = REDIS_KEYS.ACCOUNT_LOCKOUT(email);
  const lockedUntil = new Date(
    Date.now() + AUTH_CONFIG.LOCKOUT_DURATION_SECONDS * 1000
  );

  try {
    await redisHelper.setLockout(lockKey, AUTH_CONFIG.LOCKOUT_DURATION_SECONDS);
  } catch (error) {
    logger.error(
      error,
      'Failed to set Redis lockout, continuing with database'
    );
  }

  // Persist to database
  await prisma.user.updateMany({
    where: { email },
    data: {
      accountLocked: true,
      lockedUntil: lockedUntil,
      accountLockedReason: reason,
      accountLockedAt: new Date(),
      failedLoginAttempts: AUTH_CONFIG.MAX_FAILED_ATTEMPTS,
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

export const unlockAccount = async (email: string): Promise<void> => {
  const attemptKey = REDIS_KEYS.FAILED_ATTEMPTS(email);
  const lockKey = REDIS_KEYS.ACCOUNT_LOCKOUT(email);

  // Clear Redis keys
  await Promise.all([
    redisHelper.resetCounter(attemptKey),
    redisHelper.clearLockout(lockKey),
  ]);

  // Update database
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

// Record failed login attempt
export const recordFailedAttempt = async (
  email: string,
  ipAddress?: string
): Promise<{
  shouldLock: boolean;
  attemptRemaining: number;
}> => {
  const attemptKey = REDIS_KEYS.FAILED_ATTEMPTS(email);

  const attemptCount = await redisHelper.incrementWithTTL(
    attemptKey,
    AUTH_CONFIG.ATTEMPT_WINDOW_SECONDS
  );

  logger.warn({
    message: 'Failed login attempt',
    email,
    ipAddress,
    attemptCount,
    threshold: AUTH_CONFIG.MAX_FAILED_ATTEMPTS,
  });

  // Check if threshold is reached
  if (attemptCount >= AUTH_CONFIG.MAX_FAILED_ATTEMPTS) {
    await lockAccount(email, 'Too many failed login attempts!');
    return {
      shouldLock: true,
      attemptRemaining: 0,
    };
  }
  return {
    shouldLock: false,
    attemptRemaining: AUTH_CONFIG.MAX_FAILED_ATTEMPTS - attemptCount,
  };
};

// Record successful login
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
