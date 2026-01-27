import * as jwt from 'jsonwebtoken';

const INTERNAL_JWT_SECRET =
  process.env.INTERNAL_JWT_SECRET ||
  'fallback-internal-secret-do-not-use-in-prod';

export interface InternalTokenPayload {
  sub: string; // User ID
  role: string; // User Role
  aud: string; // Target Service (optional)
}

/**
 * Generates a short-lived internal token to be passed from Gateway -> Service.
 */
export const generateInternalToken = (
  payload: Omit<InternalTokenPayload, 'aud'>,
  audience = 'internal-service'
): string => {
  return jwt.sign(payload, INTERNAL_JWT_SECRET, {
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
  try {
    const decoded = jwt.verify(token, INTERNAL_JWT_SECRET, {
      issuer: 'aegis-gateway',
      audience: expectedAudience,
      algorithms: ['HS256'],
      clockTolerance: 5,
    }) as InternalTokenPayload;
    return decoded;
  } catch (_error) {
    throw new Error('Invalid internal token');
  }
};
