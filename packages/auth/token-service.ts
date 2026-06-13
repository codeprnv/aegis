import jwt from 'jsonwebtoken';
import { BadRequestError } from '../middlewares/error/index.js';

import { AUTH_CONFIG } from '../utils/common-config.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET as string;
const ACCESS_TOKEN_EXPIRY = AUTH_CONFIG.ACCESS_TOKEN_EXPIRY;

// Use dedicated refresh secret if available, otherwise fall back to JWT_SECRET
const REFRESH_TOKEN_SECRET = (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) as string;
const REFRESH_TOKEN_EXPIRY = AUTH_CONFIG.REFRESH_TOKEN_EXPIRY;

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  sessionId?: string; // Session ID (Optional for backward compatibility/access token)
  type?: 'access' | 'refresh';
}

export const generateAccessToken = (
  payload: TokenPayload,
  issuer = 'iam-service',
  audience = 'aegis-client'
): string => {
  return jwt.sign({ ...payload, type: 'access' }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer,
    audience,
  });
};

export const verifyAccessToken = (
  token: string,
  expectedAudience = 'aegis-client'
): TokenPayload => {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    issuer: 'iam-service',
    audience: expectedAudience,
  }) as TokenPayload;

  if (decoded.type !== 'access') {
    throw new BadRequestError('Invalid token type: Expected access token');
  }

  return decoded;
};

export const generateRefreshToken = (
  payload: TokenPayload,
  issuer = 'iam-service',
  audience = 'aegis-client'
) => {
  if (!payload) throw new BadRequestError('Invalid Payload!');
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: issuer,
    audience: audience,
  });
};

export const verifyRefreshToken = (
  token: string,
  expectedAudience = 'aegis-client'
): TokenPayload => {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
    issuer: 'iam-service',
    audience: expectedAudience,
  }) as TokenPayload;

  if (decoded.type !== 'refresh') {
    throw new BadRequestError('Invalid token type: Expected refresh token');
  }

  return decoded;
};
