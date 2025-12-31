import { Request, Response, NextFunction } from 'express';
import { recordRequest } from './metrics';

export const sreMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      recordRequest(duration, res.statusCode);
    });
    next();
  };
};
