import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../error/index.js';

export const requireRole = (role: 'USER' | 'ADMIN') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Support both gateway context (req.auth) and IAM service context (req.user)
    const userRole = req.auth?.role || req.user?.role;
    const isAuthenticated = req.auth || req.user;

    if (!isAuthenticated) {
      return next(new UnauthorizedError('Authentication is required!'));
    }

    if (userRole !== role) {
      return next(new ForbiddenError('Insufficient permissions!'));
    }

    return next();
  };
};
