import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../../auth/token-service.js';

export const extractAuthContext = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token =
    req.cookies?.['access_token'] || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decodedToken = verifyAccessToken(token);

    req.auth = {
      id: decodedToken.sub,
      role: decodedToken.role,
    };
  } catch (error) {
    return next();
  }
  next();
};
