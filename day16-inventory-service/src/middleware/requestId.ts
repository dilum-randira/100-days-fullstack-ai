import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export interface RequestWithIds extends Request {
  requestId?: string;
  correlationId?: string;
}

export const requestIdMiddleware = (
  req: RequestWithIds,
  res: Response,
  next: NextFunction,
): void => {
  const existingRequestId = (req.headers['x-request-id'] as string) || undefined;
  const requestId = existingRequestId || randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const existingCorrelationId = (req.headers['x-correlation-id'] as string) || undefined;
  const correlationId = existingCorrelationId || requestId;

  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  next();
};
