import { createHash, timingSafeEqual } from 'crypto';

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

export function timingSafeHashEqual(
  knownHex: string,
  candidateHex: string
): boolean {
  if (typeof knownHex !== 'string' || typeof candidateHex !== 'string') {
    return false;
  }
  const knownBuffer = Buffer.from(knownHex, 'hex');
  const candidateBuffer = Buffer.from(candidateHex, 'hex');
  if (
    knownBuffer.length !== candidateBuffer.length ||
    knownBuffer.length === 0
  ) {
    return false;
  }
  return timingSafeEqual(knownBuffer, candidateBuffer);
}
