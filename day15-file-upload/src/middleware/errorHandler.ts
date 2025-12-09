import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  const message = err instanceof Error ? err.message : 'Internal Server Error';

  res.status(400).json({
    success: false,
    error: message,
  });
};
