import type { NextFunction, Request, Response } from 'express';
import { LoginAttempt } from '../models/LoginAttempt';
import { withRequestContext } from '../utils/logger';

const normEmail = (v: unknown): string => {
  if (typeof v !== 'string') return '';
  return v.trim().toLowerCase();
};

const getClientIp = (req: Request): string => {
  const xf = (req.headers['x-forwarded-for'] as string | undefined) || '';
  const ip = xf.split(',')[0]?.trim();
  return ip || req.socket.remoteAddress || 'unknown';
};

export const loginAttemptThrottle = (opts?: {
  windowMs?: number;
  maxAttempts?: number;
  lockMs?: number;
}) => {
  const windowMs = opts?.windowMs ?? 15 * 60 * 1000;
  const maxAttempts = opts?.maxAttempts ?? 10;
  const lockMs = opts?.lockMs ?? 10 * 60 * 1000;

  return async (req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) => {
    const email = normEmail((req.body as any)?.email);
    const ip = getClientIp(req);

    // Only throttle if it looks like a login attempt
    if (!email) {
      next();
      return;
    }

    const key = `login:${email}:${ip}`;
    const now = new Date();

    const record = await LoginAttempt.findOne({ key }).exec();

    if (record?.lockedUntil && record.lockedUntil.getTime() > Date.now()) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.lockedUntil.getTime() - Date.now()) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));

      const log = withRequestContext(req.requestId, req.correlationId);
      log.warn('security.bruteforce.blocked', { email, ip, retryAfterSeconds, path: req.path });

      res.status(429).json({ success: false, error: 'TooManyRequests', message: 'Too many login attempts' });
      return;
    }

    // Mark attempt (count increments regardless of success; we'll reset on success in controller)
    const expiresAt = new Date(Date.now() + windowMs);

    if (!record) {
      await LoginAttempt.create({
        key,
        count: 1,
        firstAttemptAt: now,
        lastAttemptAt: now,
        expiresAt,
      });
      next();
      return;
    }

    const nextCount = record.count + 1;
    const shouldLock = nextCount >= maxAttempts;

    record.count = nextCount;
    record.lastAttemptAt = now;
    record.expiresAt = expiresAt;
    if (shouldLock) record.lockedUntil = new Date(Date.now() + lockMs);
    await record.save();

    if (shouldLock) {
      const retryAfterSeconds = Math.max(1, Math.ceil(lockMs / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));

      const log = withRequestContext(req.requestId, req.correlationId);
      log.warn('security.bruteforce.locked', { email, ip, retryAfterSeconds, path: req.path });

      res.status(429).json({ success: false, error: 'TooManyRequests', message: 'Too many login attempts' });
      return;
    }

    next();
  };
};
