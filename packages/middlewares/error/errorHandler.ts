import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../../utils/logger';
import { AppError } from './index';

export const errorMiddleware = (
  err: Error,

  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  let error = err;

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
      error = new AppError(
        'Something went wrong',
        StatusCodes.INTERNAL_SERVER_ERROR,
        false
      );
    } else {
      // In dev or if it has a status code, treat it as is but wrap in AppError structure for consistency if needed,
      // or just return the JSON directly.
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
