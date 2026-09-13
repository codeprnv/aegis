import { SENSITIVE_HEADERS } from '@aegis/common';
import { NextFunction, Request, Response } from 'express';

export const sanitizeHeaders = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  SENSITIVE_HEADERS.forEach((header) => {
    delete req.headers[header];
  });

  next();
};
