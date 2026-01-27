import { NextFunction, Request, Response } from 'express';

export const sanitizeHeaders = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const SENSITIVE_HEADERS = [
    'x-user-id',
    'x-user-role',
    'x-correlation-id',
    'authorization',
  ];

  SENSITIVE_HEADERS.forEach((header) => {
    delete req.headers[header];
  });

  next();
};
