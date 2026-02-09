import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';
import { logger } from '../../utils/logger.js';
import { AppError } from './index.js';

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

  // Log the error
  logger.error(
    {
      err: error,
      method: req.method,
      url: req.url,
      body: req.body,
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
