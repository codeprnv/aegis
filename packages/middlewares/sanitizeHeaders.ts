import { SENSITIVE_HEADERS } from '@aegis/common';
import { NextFunction, Request, Response } from 'express';

export const createSanitizeHeaders = (allowlist: string[] = []) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    SENSITIVE_HEADERS.forEach((header) => {
      if (!allowlist.includes(header)) {
        delete req.headers[header];
      }
    });
    next();
  };
};

export const sanitizeHeaders = createSanitizeHeaders();
