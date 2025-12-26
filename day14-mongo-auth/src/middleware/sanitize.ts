import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { withRequestContext } from '../utils/logger';

// Target: prevent common NoSQL injection patterns like { "$gt": "" }.
// - Removes keys that start with $ or contain .
// - Optionally uses mongoose's sanitizeFilter when available.

const isPlainObject = (v: unknown): v is Record<string, unknown> => {
  if (!v || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

const shouldDropKey = (k: string): boolean => k.startsWith('$') || k.includes('.');

const sanitizeObject = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeObject);
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    if (shouldDropKey(k)) continue;
    out[k] = sanitizeObject(v);
  }
  return out;
};

export const sanitizeRequest = () => {
  return (req: Request & { requestId?: string; correlationId?: string }, _res: Response, next: NextFunction): void => {
    const beforeBody = req.body;
    const beforeQuery = req.query;

    // Sanitize body/query
    req.body = sanitizeObject(req.body) as any;
    req.query = sanitizeObject(req.query) as any;

    // Best-effort: enable mongoose filter sanitization for any downstream query building
    try {
      // mongoose 6.0+ supports sanitizeFilter; no-op if absent
      (mongoose as any).sanitizeFilter?.(true);
    } catch {
      // ignore
    }

    // Security log if we dropped anything (heuristic)
    const dropped =
      JSON.stringify(beforeBody) !== JSON.stringify(req.body) || JSON.stringify(beforeQuery) !== JSON.stringify(req.query);

    if (dropped) {
      const log = withRequestContext(req.requestId, req.correlationId);
      log.warn('security.sanitize.drop_keys', {
        path: req.path,
        method: req.method,
      });
    }

    next();
  };
};
