import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { IdempotencyKey } from '../models/IdempotencyKey';
import { withRequestContext } from '../utils/logger';
import type { RequestWithIds } from './requestId';
import type { ShardContext } from './shardKey';

type Options = {
  required: boolean;
  ttlMs?: number;
};

type StoredResponse = {
  statusCode: number;
  responseBody: unknown;
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
  // Use route template when available to keep stable keys across ids.
  const routePath = (req as any).route?.path;
  if (routePath) return `${req.baseUrl}${routePath}`;
  return `${req.baseUrl}${req.path}`;
};

const isSuccessStatus = (code: number): boolean => code >= 200 && code < 300;

export const idempotency = (opts: Options) => {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;

  return async (
    req: Request & Partial<RequestWithIds> & Partial<ShardContext>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const key = (req.headers['idempotency-key'] as string | undefined)?.trim();

    if (!key) {
      if (opts.required && (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH')) {
        res.status(400).json({ success: false, error: 'IdempotencyKeyRequired' });
        return;
      }
      next();
      return;
    }

    const requestId = (req as any).requestId as string | undefined;
    const correlationId = (req as any).correlationId as string | undefined;
    const log = withRequestContext(requestId, correlationId);

    const endpoint = normalizeEndpoint(req);
    const organizationId = (req as any).organizationId as string | undefined;
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
        const stored = existing.toObject() as any;
        const storedResponse: StoredResponse = {
          statusCode: stored.statusCode,
          responseBody: stored.responseBody,
        };

        res.status(storedResponse.statusCode).json(storedResponse.responseBody as any);
        return;
      }

      log.info('idempotency.miss', { key, endpoint, organizationId });

      // Reserve the key to avoid double-processing under concurrent retries.
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
        // Likely a race: someone else created it. Re-check.
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
            // Always store the exact response body to avoid API format changes.
            if (isSuccessStatus(statusCode)) {
              await IdempotencyKey.updateOne(
                { key, endpoint, organizationId, requestHash },
                { $set: { responseBody: body, statusCode, expiresAt } },
              ).exec();
              log.info('idempotency.store', { key, endpoint, organizationId, statusCode });
            } else {
              // On non-success, delete reservation so client can retry with same key.
              await IdempotencyKey.deleteOne({ key, endpoint, organizationId, requestHash }).exec();
              log.info('idempotency.release', { key, endpoint, organizationId, statusCode });
            }
          } catch (e: any) {
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
