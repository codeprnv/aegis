import jwt from 'jsonwebtoken';

// Decode once at module load, reuse on every call
const PRIVATE_KEY: string | null = process.env.INTERNAL_JWT_PRIVATE_KEY_B64
  ? Buffer.from(process.env.INTERNAL_JWT_PRIVATE_KEY_B64, 'base64').toString('utf-8')
  : null;

const PUBLIC_KEY: string | null = process.env.API_GATEWAY_PUBLIC_KEY_B64
  ? Buffer.from(process.env.API_GATEWAY_PUBLIC_KEY_B64, 'base64').toString('utf-8')
  : null;

export interface InternalTokenPayload {
  sub: string; // User ID
  role: string; // User Role
  aud?: string; // Target Service (optional)
}

/**
 * Generates a short-lived internal token to be passed from Gateway -> Service.
 */
export const generateInternalToken = (
  payload: Omit<InternalTokenPayload, 'aud'>,
  audience = 'internal-service'
): string => {
  if (!PRIVATE_KEY) {
    throw new Error('INTERNAL_JWT_PRIVATE_KEY_B64 is not set. Gateway cannot sign internal tokens.');
  }

  return jwt.sign(payload, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '1m', //short-lived
    audience,
    issuer: 'aegis-gateway',
  });
};

/**
 * Verifies the internal token at the Service level.
 */
export const verifyInternalToken = (
  token: string,
  expectedAudience: string
): InternalTokenPayload => {
  if (!PUBLIC_KEY) {
    throw new Error('API_GATEWAY_PUBLIC_KEY_B64 is not set. Service cannot verify internal tokens.');
  }

  try {
    const decoded = jwt.verify(token, PUBLIC_KEY, {
      issuer: 'aegis-gateway',
      audience: expectedAudience,
      algorithms: ['RS256'],
      clockTolerance: 5,
    }) as InternalTokenPayload;
    return decoded;
  } catch (_error) {
    throw new Error('Invalid internal token');
  }
};
