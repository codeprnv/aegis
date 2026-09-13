import {
  AUTH_ROLES,
  generateAccessToken,
  generateRefreshToken,
  JWT_AUDIENCES,
  JWT_ISSUERS,
  TOKEN_EXPIRATIONS,
} from '@aegis/auth';
import { hashTokenSHA256 } from '@aegis/common';

/**
 * Input parameters required to mint a standard session token pair.
 */
export interface TokenIssuanceParams {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  rememberMe?: boolean;
}

/**
 * Resulting artifacts from cryptographic session token minting.
 */
export interface TokenPairResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  expiresAt: Date;
}

/**
 * Input parameters for issuing a temporary restricted-scope token.
 */
export interface RestrictedTokenParams {
  userId: string;
  email: string;
  role?: string;
}

/**
 * Centralized cryptographic token issuance engine. Mints access and refresh JWTs,
 * performs SHA-256 hashing for database persistence, and computes expiration boundaries.
 *
 * @param params - Identity and session context required for token signing
 * @returns Minted token pair, refresh hash, and expiration date
 */
export const issueSessionTokenPair = (
  params: TokenIssuanceParams
): TokenPairResult => {
  const { userId, email, role, sessionId, rememberMe } = params;

  const accessToken = generateAccessToken(
    {
      sub: userId,
      email,
      role,
      sessionId,
    },
    JWT_ISSUERS.IAM,
    JWT_AUDIENCES.CLIENT
  );

  const refreshExpiryDays = rememberMe
    ? TOKEN_EXPIRATIONS.REMEMBER_ME_DAYS
    : TOKEN_EXPIRATIONS.REFRESH_TOKEN_DAYS;
  const refreshExpiryStr = `${refreshExpiryDays}d`;

  const refreshToken = generateRefreshToken(
    {
      sub: userId,
      email,
      role,
      sessionId,
    },
    JWT_ISSUERS.IAM,
    JWT_AUDIENCES.CLIENT,
    refreshExpiryStr
  );

  const refreshTokenHash = hashTokenSHA256(refreshToken);
  const expiresAt = new Date(
    Date.now() + refreshExpiryDays * 24 * 60 * 60 * 1000
  );

  return {
    accessToken,
    refreshToken,
    refreshTokenHash,
    expiresAt,
  };
};

/**
 * Mints a short-lived restricted token for users requiring mandatory password changes.
 * Restricts access scope until the password update lifecycle completes.
 *
 * @param params - Identity attributes of the restricted user
 * @returns Signed short-lived JWT
 */
export const issueRestrictedToken = (params: RestrictedTokenParams): string => {
  return generateAccessToken(
    {
      sub: params.userId,
      email: params.email,
      role: params.role || AUTH_ROLES.RESTRICTED,
      sessionId: 'restricted-session',
    },
    JWT_ISSUERS.IAM,
    JWT_AUDIENCES.CLIENT
  );
};
