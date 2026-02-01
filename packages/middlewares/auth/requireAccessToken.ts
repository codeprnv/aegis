import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../../auth/token-service.js';
import { UnauthorizedError } from '../error/index.js';

export const requireAccessToken = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.cookies['access_token'] || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token required');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    // Verify and decode token
    const decoded = verifyAccessToken(token);

    req.user = decoded;

    next();
  } catch (error) {
    next(error);
  }
};
