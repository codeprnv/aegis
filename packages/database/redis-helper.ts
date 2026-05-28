import { redis } from './redis.js';

export async function isLocked(key: string): Promise<boolean> {
  const exists = await redis.exists(key);
  return exists === 1; // returns true if key exists
}

export async function getTTL(key: string): Promise<number> {
  const ttl = await redis.ttl(key);
  return ttl > 0 ? ttl : 0; // returns ttl in seconds if key exists else 0
}

// Increment the counter and set TTL if its new key
export async function incrementWithTTL(
  key: string,
  ttl: number
): Promise<number> {
  const multi = redis.multi();
  multi.incr(key);
  multi.expire(key, ttl, 'NX');

  const results = await multi.exec();

  // Results is [[error, result], [error, result]]
  // Check if first command (incr) succeeded (error is null)
  if (results && results[0] && results[0][0] === null) {
    return results[0][1] as number;
  }
  throw new Error('Failed to increment Redis key!');
}

export async function setLockout(key: string, ttl: number): Promise<void> {
  await redis.set(key, 'locked', 'EX', ttl);
}

export async function resetCounter(key: string): Promise<void> {
  await redis.del(key);
}

export async function clearLockout(key: string): Promise<void> {
  await redis.del(key);
}
