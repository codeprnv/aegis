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
  const p = redis.pipeline();
  p.incr(key);
  p.expire(key, ttl);

  // @upstash/redis pipeline.exec() returns an array of results, not [error, result] pairs
  const results = await p.exec();

  if (results && results.length > 0) {
    // The first command was incr(key)
    return results[0] as number;
  }
  throw new Error('Failed to increment Redis key!');
}

export async function setLockout(key: string, ttl: number): Promise<void> {
  await redis.set(key, 'locked', { ex: ttl });
}

export async function resetCounter(key: string): Promise<void> {
  await redis.del(key);
}

export async function clearLockout(key: string): Promise<void> {
  await redis.del(key);
}
