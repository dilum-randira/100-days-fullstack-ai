import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: unknown,
  req: Request & { requestId?: string },
  res: Response,
  _next: NextFunction,
): void => {
  const requestId = req.requestId;

  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof Error) {
    message = err.message;
    statusCode = (err as any).statusCode || 500;
  }

  logger.error('Request error', {
    requestId,
    path: req.path,
    method: req.method,
    statusCode,
    message,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId,
  });
};
