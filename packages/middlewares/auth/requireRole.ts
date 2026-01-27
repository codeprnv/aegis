import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../error/index.js';

export const requireRole = (role: 'user' | 'admin') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(new UnauthorizedError('Authentication is required!'));
    }

    if (req.auth.role !== role) {
      return next(new ForbiddenError('Insufficient permissions!'));
    }

    return next();
  };
};
