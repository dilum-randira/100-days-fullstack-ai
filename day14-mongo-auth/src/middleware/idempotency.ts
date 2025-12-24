import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { IdempotencyKey } from '../models/IdempotencyKey';
import { withRequestContext } from '../utils/logger';

type Options = {
  required: boolean;
  ttlMs?: number;
};

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const stableJson = (value: unknown): string => {
  const seen = new WeakSet<object>();
  const stringify = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (typeof v !== 'object') return v;
    if (Buffer.isBuffer(v)) return v.toString('base64');
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(stringify);
    if (seen.has(v)) return '[Circular]';
    seen.add(v);
    const keys = Object.keys(v).sort();
    const out: any = {};
    for (const k of keys) out[k] = stringify(v[k]);
    return out;
  };
  return JSON.stringify(stringify(value));
};

const hashRequest = (req: Request): string => {
  const payload = {
    method: req.method,
    path: req.baseUrl + req.path,
    query: req.query,
    body: req.body,
  };
  return crypto.createHash('sha256').update(stableJson(payload)).digest('hex');
};

const normalizeEndpoint = (req: Request): string => {
  const routePath = (req as any).route?.path;
  if (routePath) return `${req.baseUrl}${routePath}`;
  return `${req.baseUrl}${req.path}`;
};

const isSuccessStatus = (code: number): boolean => code >= 200 && code < 300;

export const idempotency = (opts: Options) => {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;

  return async (req: Request & any, res: Response, next: NextFunction): Promise<void> => {
    const key = (req.headers['idempotency-key'] as string | undefined)?.trim();

    if (!key) {
      if (opts.required && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        res.status(400).json({ success: false, error: 'IdempotencyKeyRequired' });
        return;
      }
      next();
      return;
    }

    const requestId = req.requestId as string | undefined;
    const correlationId = req.correlationId as string | undefined;
    const log = withRequestContext(requestId, correlationId);

    const endpoint = normalizeEndpoint(req);
    const organizationId = (req.headers['x-organization-id'] as string | undefined) || (req.body as any)?.organizationId;
    const requestHash = hashRequest(req);

    try {
      const existing = await IdempotencyKey.findOne({ key, endpoint, organizationId }).exec();
      if (existing) {
        if (existing.requestHash !== requestHash) {
          log.warn('idempotency.conflict', { key, endpoint, organizationId });
          res.status(409).json({ success: false, error: 'IdempotencyKeyConflict' });
          return;
        }
        log.info('idempotency.hit', { key, endpoint, organizationId });
        res.status(existing.statusCode).json(existing.responseBody as any);
        return;
      }

      log.info('idempotency.miss', { key, endpoint, organizationId });

      const expiresAt = new Date(Date.now() + ttlMs);
      try {
        await IdempotencyKey.create({
          key,
          endpoint,
          organizationId,
          requestHash,
          statusCode: 0,
          responseBody: { success: false, error: 'IdempotencyPending' },
          expiresAt,
        });
      } catch (err: any) {
        const again = await IdempotencyKey.findOne({ key, endpoint, organizationId }).exec();
        if (again) {
          if (again.requestHash !== requestHash) {
            log.warn('idempotency.conflict_race', { key, endpoint, organizationId });
            res.status(409).json({ success: false, error: 'IdempotencyKeyConflict' });
            return;
          }
          log.info('idempotency.hit_race', { key, endpoint, organizationId });
          res.status(again.statusCode).json(again.responseBody as any);
          return;
        }
        throw err;
      }

      const originalJson = res.json.bind(res);
      const originalStatus = res.status.bind(res);
      let statusCode = 200;

      (res as any).status = (code: number) => {
        statusCode = code;
        return originalStatus(code);
      };

      (res as any).json = (body: any) => {
        void (async () => {
          try {
            if (isSuccessStatus(statusCode)) {
              await IdempotencyKey.updateOne(
                { key, endpoint, organizationId, requestHash },
                { $set: { responseBody: body, statusCode, expiresAt } },
              ).exec();
              log.info('idempotency.store', { key, endpoint, organizationId, statusCode });
            } else {
              await IdempotencyKey.deleteOne({ key, endpoint, organizationId, requestHash }).exec();
              log.info('idempotency.release', { key, endpoint, organizationId, statusCode });
            }
          } catch (e: any) {
            // Don't fail the request if storing fails.
            log.error('idempotency.store_error', { key, endpoint, organizationId, message: e.message });
          }
        })();

        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};
