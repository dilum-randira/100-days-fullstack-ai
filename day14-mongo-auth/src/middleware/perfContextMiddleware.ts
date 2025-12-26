import type { NextFunction, Request, Response } from 'express';
import { perfContext } from '../perf/perfContext';

export const perfContextMiddleware = () => {
  return (req: Request & { requestId?: string; correlationId?: string }, _res: Response, next: NextFunction): void => {
    perfContext.run({ requestId: req.requestId, correlationId: req.correlationId }, () => next());
  };
};
