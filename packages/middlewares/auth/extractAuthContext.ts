import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../../auth/token-service.js';
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
    req.cookies?.['access_token'] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decodedToken = verifyAccessToken(token);

    // If token has a sessionId, verify against the edge revocation blocklist
    if (decodedToken.sessionId) {
      try {
        const isRevoked = await redis.get(
          `aegis:revoked:session:${decodedToken.sessionId}`
        );
        if (isRevoked) {
          res.status(401).json({
            status: 'error',
            statusCode: 401,
            message: 'Session has been revoked',
          });
          return;
        }
      } catch (redisError) {
        // Fail-safe resilience: log a high-priority operational alert without crashing the edge
        logger.error(
          {
            alert: "EDGE_REVOCATION_BYPASS_ACTIVE",
            securityRisk: "HIGH",
            sessionId: decodedToken.sessionId,
            error: redisError
          },
          'CRITICAL: Edge session revocation cache unreachable - fallback to raw JWT verification active'
        );
      }
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
