import { AUTH_ROLES, SENTINEL_USERS } from '@aegis/auth';
import type { NextFunction, Request, Response } from 'express';

/**
 * Express middleware enforcing authentication at the API Gateway edge perimeter.
 * Drops unauthenticated requests with HTTP 401 before proxying to downstream microservices,
 * preventing CPU cycle waste on internal RS256 token minting for protected endpoints.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next middleware callback
 */
export const gatewayRequireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (
    !req.auth?.id ||
    req.auth.id === SENTINEL_USERS.ANONYMOUS ||
    req.auth.role === (AUTH_ROLES.GUEST as string)
  ) {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      message: 'Authentication required',
    });
    return;
  }
  next();
};
