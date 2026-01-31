import jwt from 'jsonwebtoken';
import { BadRequestError } from '../middlewares/error/index.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET as string;
const ACCESS_TOKEN_EXPIRY = '15m';

const REFRESH_TOKEN_SECRET = process.env.JWT_SECRET as string;
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
}

export const generateAccessToken = (
  payload: TokenPayload,
  issuer = 'iam-service',
  audience = 'api-service'
): string => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer,
    audience,
  });
};

export const verifyAccessToken = (
  token: string,
  expectedAudience = 'api-service'
): TokenPayload => {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    issuer: 'iam-service',
    audience: expectedAudience,
  }) as TokenPayload;

  return decoded;
};

export const generateRefreshToken = (
  payload: TokenPayload,
  issuer = 'iam-service',
  audience = 'api-service'
) => {
  if (!payload) throw new BadRequestError('Invalid Payload!');
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: issuer,
    audience: audience,
  });
};

export const verifyRefreshToken = (
  token: string,
  expectedAudience = 'api-service'
): TokenPayload => {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
    issuer: 'iam-service',
    audience: expectedAudience,
  }) as TokenPayload;

  return decoded;
};
