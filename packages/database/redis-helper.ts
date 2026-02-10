import { redis } from './redis.js';

export class RedisHelper {
  async isLocked(key: string): Promise<boolean> {
    const exists = await redis.exists(key);
    return exists === 1; // returns true if key exists
  }

  async getTTL(key: string): Promise<number> {
    const ttl = await redis.ttl(key);
    return ttl > 0 ? ttl : 0; // returns ttl in seconds if key exists else 0
  }

  // Increment the counter and set TTL if its new key
  async incrementWithTTL(key: string, ttl: number): Promise<number> {
    const multi = redis.multi();
    multi.incr(key);
    multi.expire(key, ttl, 'NX');

    const results = await multi.exec();

    // Results is [[error, result], [error, result]]
    if (results && results[0] && results[0][0]) {
      return results[0][1] as number;
    }
    throw new Error('Failed to increment Redis key!');
  }

  async setLockout(key: string, ttl: number): Promise<void> {
    await redis.set(key, 'locked', 'EX', ttl);
  }

  async resetCounter(key: string): Promise<void> {
    await redis.del(key);
  }

  async clearLockout(key: string): Promise<void> {
    await redis.del(key);
  }
}
