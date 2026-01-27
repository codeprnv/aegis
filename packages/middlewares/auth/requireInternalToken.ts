import { NextFunction, Request, Response } from 'express';
import { verifyInternalToken } from '../../auth/internal-token.js';
import { logger } from '../../utils/logger.js';
import { UnauthorizedError } from '../error/index.js';

export const requireInternalToken = (serviceName: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const token = req.headers['authorization']?.split(' ')[1];

      if (!token) {
        throw new UnauthorizedError('Missing the internal bearer token!');
      }

      // Verify the internal token coming from API Gateway to check if the request is coming from gateway only or not
      const decodedToken = verifyInternalToken(token, serviceName);

      if (!decodedToken) {
        throw new UnauthorizedError('Invalid internal bearer token!');
      }

      req.user = decodedToken;
      req.log = logger.child({ userId: req.user?.sub });
      next();
    } catch (error) {
      return next(error);
    }
  };
};
