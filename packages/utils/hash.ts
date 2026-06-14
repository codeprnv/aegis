import { createHash } from 'crypto';

/**
 * Hash a high-entropy token using SHA-256.
 * This is used for cryptographically secure random tokens (like Refresh Tokens or Reset Tokens)
 * where the slow memory-hard protection of Argon2id is unnecessary and computationally wasteful.
 * 
 * @param token The raw token string to hash
 * @returns The SHA-256 hash in hex format
 */
export function hashTokenSHA256(token: string): string {
  if (!token) {
    throw new Error('Token must not be empty');
  }
  return createHash('sha256').update(token).digest('hex');
}
