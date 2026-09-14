import { AUTH_ROLES, SENTINEL_USERS } from '@aegis/auth';
import { UnauthorizedError } from '@aegis/middlewares';
import type { NextFunction, Request, Response } from 'express';

/**
 * Express middleware enforcing authentication defense-in-depth on internal microservice controllers.
 * Drops requests that lack authenticated user identity or carry anonymous/guest tokens.
 *
 * @param req - Express request
 * @param _res - Express response
 * @param next - Express next middleware callback
 */
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (
    !req.user?.sub ||
    req.user.sub === SENTINEL_USERS.ANONYMOUS ||
    req.user.role === (AUTH_ROLES.GUEST as string)
  ) {
    throw new UnauthorizedError('Authentication required');
  }
  next();
};
