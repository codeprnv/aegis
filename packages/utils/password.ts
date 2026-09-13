import * as argon2 from 'argon2';
import PasswordValidator from 'password-validator';
import { logger } from './logger.js';

export const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MB
  timeCost: 3, // iterations
  parallelism: 1,
  hashLength: 32,
  saltLength: 32,
} as const;

/**
 * Pre-computed static dummy Argon2id hash generated with exact ARGON2_CONFIG parameters:
 * m=19456 (19 MB), t=3 iterations, p=1 lane.
 * Used for constant-time password verification on non-existent users (SEC-06)
 * without blocking the event loop on bootstrap.
 */
export const DUMMY_ARGON2_HASH =
  '$argon2id$v=19$m=19456,t=3,p=1$851RB88Lpw7nqpPcBRRRmQ$VyArlnQcmCTBsvEFS/bLrb6EQoPJkDZNEt7CwMYCncg';

/**
 * Standard password complexity constraints used across Aegis.
 */
export const DEFAULT_PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  LOWERCASE_CHARS: 3,
  UPPERCASE_CHARS: 1,
  DIGITS: 1,
  SYMBOLS: 1,
} as const;

export interface PasswordOptions {
  MIN_LENGTH?: number;
  MAX_LENGTH?: number;
  LOWERCASE_CHARS?: number;
  UPPERCASE_CHARS?: number;
  DIGITS?: number;
  SYMBOLS?: number;
}

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
  } catch {
    // If the hash is invalid or malformed, return false instead of throwing
    return false;
  }
}

function formatPasswordErrors(
  errors: Array<{ validation: string; arguments: number; message: string }>
): string {
  const requirements = errors.map((error) => {
    const count = error.arguments;
    const type = error.validation;

    const typeMap: Record<string, string> = {
      uppercase: 'uppercase letter',
      lowercase: 'lowercase letter',
      digits: 'digit',
      symbols: 'symbol',
      min: 'minimum length',
      max: 'maximum length',
    };

    const typeName = typeMap[type] || type;
    const plural = count > 1 ? 's' : '';

    return `${count} ${typeName}${plural}`;
  });

  if (requirements.length === 1) {
    return `The password should contain ${requirements[0]}`;
  } else if (requirements.length === 2) {
    return `The password should contain ${requirements[0]} and ${requirements[1]}`;
  } else {
    const allButLast = requirements.slice(0, -1).join(', ');
    const last = requirements[requirements.length - 1];
    return `The password should contain ${allButLast}, and ${last}`;
  }
}

export function validatePassword(password: string, options?: PasswordOptions) {
  const passwordSchema = new PasswordValidator();
  passwordSchema
    .min(options?.MIN_LENGTH || 8)
    .max(options?.MAX_LENGTH || 128)
    .lowercase(options?.LOWERCASE_CHARS || 3)
    .uppercase(options?.UPPERCASE_CHARS || 1)
    .digits(options?.DIGITS || 1)
    .symbols(options?.SYMBOLS || 1);

  const result = passwordSchema.validate(password, { details: true });

  if (result === true) {
    return { success: true, error: null };
  }

  // If validation fails, result should be an array of error objects
  // When using { details: true }, empty array means NO ERRORS = success!
  if (Array.isArray(result)) {
    if (result.length === 0) {
      // Empty array means no errors = password is valid
      return { success: true, error: null };
    }
    // Array with errors = password is invalid
    const errorMessage = formatPasswordErrors(result);
    return { success: false, error: errorMessage };
  }

  // Unexpected result type
  logger.error({ result }, 'Unexpected password validation result type');
  return { success: false, error: 'Password validation failed' };
}
