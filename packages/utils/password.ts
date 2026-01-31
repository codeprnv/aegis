import * as argon2 from 'argon2';

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3, // iterations
  parallelism: 1,
  hashLength: 32,
  saltLength: 32,
} as const;

/**
 * Hash a password using Argon2id
 * Returns a PHC-compliant string that includes all parameters for future verification
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_CONFIG);
}

/**
 * Verify a password against a PHC-formatted hash
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    return await argon2.verify(storedHash, password);
  } catch (err) {
    // If the hash is invalid or malformed, return false instead of throwing
    return false;
  }
}
