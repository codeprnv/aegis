import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger.js';
import { AppError } from './index.js';

/**
 * Recursively masks sensitive fields such as passwords, OTPs, tokens, and secrets from logged request bodies.
 */
function maskSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(maskSensitiveData);

  const sensitivePattern =
    /password|token|otp|secret|authorization|credential/i;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (sensitivePattern.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = maskSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const errorMiddleware = (
  err: Error,

  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  const error = err;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      status: 'error',
      statusCode: StatusCodes.BAD_REQUEST,
      message: 'Validation failed',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  // Log the error with all sensitive credential fields redacted
  logger.error(
    {
      err: error,
      method: req.method,
      url: req.url,
      body: req.body ? maskSensitiveData(req.body) : undefined,
    },
    'Global Error Handler'
  );

  // Default error if not instance of AppError
  if (!(error instanceof AppError)) {
    const statusCode =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (error as any).statusCode || StatusCodes.INTERNAL_SERVER_ERROR;

    // In production, mask unknown 500 errors
    if (
      process.env.NODE_ENV === 'production' &&
      statusCode === StatusCodes.INTERNAL_SERVER_ERROR
    ) {
      const maskedError = new AppError(
        'Something went wrong',
        StatusCodes.INTERNAL_SERVER_ERROR,
        false
      );
      return res.status(maskedError.statusCode).json({
        status: 'error',
        statusCode: maskedError.statusCode,
        message: maskedError.message,
      });
    }
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      status: 'error',
      statusCode: error.statusCode,
      message: error.message,
      ...(error.details && { details: error.details }),
      ...(process.env.NODE_ENV !== 'production' && {
        stack: (err as Error).stack,
      }),
    });
  }

  // Fallback for non-AppError that wasn't converted (though logic above should handle it)
  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    status: 'error',
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    message: 'Something went wrong',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};
