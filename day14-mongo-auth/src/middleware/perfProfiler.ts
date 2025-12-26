import type { NextFunction, Request, Response } from 'express';
import { recordLatency } from '../perf/perfMetrics';
import { withRequestContext } from '../utils/logger';

const nowMs = () => Number(process.hrtime.bigint()) / 1_000_000;

const normalizeEndpoint = (req: Request): string => {
  const routePath = (req as any).route?.path;
  if (routePath) return `${req.baseUrl}${routePath}`;
  return `${req.baseUrl}${req.path}`;
};

export const perfProfiler = (opts?: { slowMs?: number }) => {
  const slowMs = opts?.slowMs ?? 300;

  return (req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction): void => {
    const start = nowMs();

    res.on('finish', () => {
      const durationMs = nowMs() - start;
      const key = `${req.method} ${normalizeEndpoint(req)}`;
      recordLatency(key, durationMs, slowMs);

      if (durationMs >= slowMs) {
        const log = withRequestContext(req.requestId, req.correlationId);
        log.warn('perf.slow_route', {
          key,
          durationMs: Number(durationMs.toFixed(2)),
          statusCode: res.statusCode,
        });
      }
    });

    next();
  };
};
