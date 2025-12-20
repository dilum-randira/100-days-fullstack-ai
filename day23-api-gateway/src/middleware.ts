import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { config } from './config';

export interface AuthenticatedRequest extends Request {
  user?: any;
  requestId?: string;
  correlationId?: string;
}

export const requestIdMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const existingId = (req.headers['x-request-id'] as string) || undefined;
  const requestId = existingId || uuidv4();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  // Correlation ID: generate if missing and always propagate
  const existingCorrelationId = (req.headers['x-correlation-id'] as string) || undefined;
  const correlationId = existingCorrelationId || requestId;
  req.correlationId = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  next();
};

export const jwtAuthMiddleware = (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(); // allow unauthenticated for public endpoints; downstream can enforce auth
  }

  const token = authHeader.substring('Bearer '.length);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
  } catch (_err) {
    // Invalid token; treat as unauthenticated, do not crash
  }

  next();
};

export const gatewayRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

export const errorHandler = (err: any, req: AuthenticatedRequest, res: Response, _next: NextFunction): void => {
  const status = err.status || 502;
  const requestId = req.requestId;
  const correlationId = req.correlationId;

  res.status(status).json({
    success: false,
    error: err.code || 'GatewayError',
    message: err.message || 'Upstream service error',
    requestId,
    correlationId,
  });
};
