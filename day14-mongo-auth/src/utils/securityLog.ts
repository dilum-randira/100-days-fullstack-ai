import type { Request } from 'express';
import { withRequestContext } from './logger';

export const getClientIp = (req: Request): string => {
  const xf = (req.headers['x-forwarded-for'] as string | undefined) || '';
  const ip = xf.split(',')[0]?.trim();
  return ip || req.socket.remoteAddress || 'unknown';
};

export const getUserAgent = (req: Request): string | undefined => {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : undefined;
};

export const logSuspicious = (
  req: Request & { requestId?: string; correlationId?: string; user?: any },
  event: string,
  details: Record<string, unknown> = {},
): void => {
  const log = withRequestContext(req.requestId, req.correlationId);
  log.warn(event, {
    ...details,
    path: req.path,
    method: req.method,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    userId: req.user?.id,
  });
};
