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
    'authorization', // If we want to fully replace it, though usually we might keep it if it's the external JWT. Plan says "strip internal-only headers".
    // Let's stick to the plan: strip internal identity headers.
  ];

  SENSITIVE_HEADERS.forEach((header) => {
    delete req.headers[header];
  });

  next();
};
