import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors.js';
import { Logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const isOperational = err instanceof AppError ? err.isOperational : false;
  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 400 : 500);
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Always log the actual error for observability
  Logger.error(`[API Error] ${req.method} ${req.originalUrl}: ${err.message}`, err, {
    statusCode,
    errorCode,
    path: req.originalUrl,
    ip: req.ip,
  });

  // Never leak raw stack traces or internal details to user
  const userMessage = isOperational
    ? err.message
    : 'An unexpected error occurred. Your personal cinema library is safe.';

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: userMessage,
      ...(process.env.NODE_ENV === 'development' && !isOperational ? { details: err.message } : {}),
    },
  });
}
