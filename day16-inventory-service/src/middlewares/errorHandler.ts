import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof Error) {
    message = err.message;
    statusCode = (err as any).statusCode || 500;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};
