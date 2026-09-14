import jwt, { type SignOptions } from 'jsonwebtoken';
import { BadRequestError } from '../middlewares/error/index.js';
import {
  JWT_AUDIENCES,
  JWT_ISSUERS,
  JWT_SIGNING_ALGORITHMS,
  TOKEN_EXPIRATIONS,
  TOKEN_TYPES,
} from './tokens.js';

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET as string;
const ACCESS_TOKEN_EXPIRY = TOKEN_EXPIRATIONS.ACCESS_TOKEN;

// Use dedicated refresh secret if available, otherwise fall back to JWT_SECRET
const REFRESH_TOKEN_SECRET = (process.env.JWT_REFRESH_SECRET ||
  process.env.JWT_SECRET) as string;
const REFRESH_TOKEN_EXPIRY = TOKEN_EXPIRATIONS.REFRESH_TOKEN;

export interface TokenPayload {
  sub: string; // User ID
  email: string;
  role: string;
  sessionId?: string; // Session ID (Optional for backward compatibility/access token)
  type?: 'access' | 'refresh';
}

export const generateAccessToken = (
  payload: TokenPayload,
  issuer: string = JWT_ISSUERS.IAM,
  audience: string = JWT_AUDIENCES.CLIENT
): string => {
  return jwt.sign(
    { ...payload, type: TOKEN_TYPES.ACCESS },
    ACCESS_TOKEN_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer,
      audience,
    }
  );
};

export const verifyAccessToken = (
  token: string,
  expectedAudience: string = JWT_AUDIENCES.CLIENT
): TokenPayload => {
  const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET, {
    issuer: JWT_ISSUERS.IAM,
    audience: expectedAudience,
    algorithms: [JWT_SIGNING_ALGORITHMS.SYMMETRIC],
  }) as TokenPayload;

  if (decoded.type !== TOKEN_TYPES.ACCESS) {
    throw new BadRequestError('Invalid token type: Expected access token');
  }

  return decoded;
};

export const generateRefreshToken = (
  payload: TokenPayload,
  issuer: string = JWT_ISSUERS.IAM,
  audience: string = JWT_AUDIENCES.CLIENT,
  expiresIn: string | number = REFRESH_TOKEN_EXPIRY
) => {
  if (!payload) throw new BadRequestError('Invalid Payload!');
  return jwt.sign(
    { ...payload, type: TOKEN_TYPES.REFRESH },
    REFRESH_TOKEN_SECRET,
    {
      expiresIn: expiresIn as SignOptions['expiresIn'],
      issuer: issuer,
      audience: audience,
    }
  );
};

export const verifyRefreshToken = (
  token: string,
  expectedAudience: string = JWT_AUDIENCES.CLIENT
): TokenPayload => {
  const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET, {
    issuer: JWT_ISSUERS.IAM,
    audience: expectedAudience,
    algorithms: [JWT_SIGNING_ALGORITHMS.SYMMETRIC],
  }) as TokenPayload;

  if (decoded.type !== TOKEN_TYPES.REFRESH) {
    throw new BadRequestError('Invalid token type: Expected refresh token');
  }

  return decoded;
};
