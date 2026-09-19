import { NextFunction, Request, Response } from 'express';
import {
  AUTH_COOKIE_NAMES,
  REDIS_AUTH_KEYS,
  verifyAccessToken,
} from '@aegis/auth';
import { redis } from '../../database/redis.js';
import { logger } from '../../utils/logger.js';

/**
 * Express middleware that extracts the access token from cookies or authorization header,
 * verifies the token signature and claims, checks the edge revocation blocklist in Redis,
 * and attaches the decoded authentication context (id, role, sessionId) to the request.
 *
 * @param req Express request
 * @param res Express response
 * @param next Next middleware callback
 */
export const extractAuthContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token =
    req.cookies?.[AUTH_COOKIE_NAMES.ACCESS_TOKEN] ||
    req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decodedToken = verifyAccessToken(token);

    // Verify against the edge revocation blocklist (session and user level)
    try {
      const [isSessionRevoked, isUserRevoked] = await Promise.all([
        decodedToken.sessionId
          ? redis.get(REDIS_AUTH_KEYS.REVOKED_SESSION(decodedToken.sessionId))
          : null,
        decodedToken.sub
          ? redis.get(REDIS_AUTH_KEYS.REVOKED_USER(decodedToken.sub))
          : null,
      ]);

      if (isSessionRevoked || isUserRevoked) {
        res.status(401).json({
          status: 'error',
          statusCode: 401,
          message: isUserRevoked
            ? 'Account has been locked due to a security incident'
            : 'Session has been revoked',
        });
        return;
      }
    } catch (redisError) {
      // Fail-safe resilience: log a high-priority operational alert without crashing the edge
      logger.error(
        {
          alert: 'EDGE_REVOCATION_BYPASS_ACTIVE',
          securityRisk: 'HIGH',
          sessionId: decodedToken.sessionId,
          userId: decodedToken.sub,
          error: redisError,
        },
        'CRITICAL: Edge revocation cache unreachable - fallback to raw JWT verification active'
      );
    }

    req.auth = {
      id: decodedToken.sub,
      role: decodedToken.role as 'USER' | 'ADMIN',
      sessionId: decodedToken.sessionId,
    };
  } catch (_error) {
    // If token verification fails, allow unauthenticated request to proceed to public routes
    return next();
  }

  next();
};
