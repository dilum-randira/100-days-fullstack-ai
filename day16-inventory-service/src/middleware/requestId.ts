import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const id = randomUUID();
  // @ts-expect-error - extended via declaration merging
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};
