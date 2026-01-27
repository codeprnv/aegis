import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../error/index.js';

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.auth) {
    return next(new UnauthorizedError('Authentication is required!'));
  }
  return next();
};
