import { NextFunction, Request, Response } from 'express';

export const sanitizeHeaders = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const SENSITIVE_HEADERS = [
    'x-user-id',
    'x-user-role',
    'x-user-email',
    'x-session-id',
    'x-internal-token',
    'x-correlation-id',
    'x-auth-context',
  ];

  SENSITIVE_HEADERS.forEach((header) => {
    delete req.headers[header];
  });

  next();
};
