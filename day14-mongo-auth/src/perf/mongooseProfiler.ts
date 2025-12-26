import mongoose from 'mongoose';
import { recordLatency } from './perfMetrics';
import { withRequestContext } from '../utils/logger';

// Lightweight Mongoose query profiler:
// - Measures query duration (via debug hook)
// - Logs slow queries with request context if available

let enabled = false;

type Context = { requestId?: string; correlationId?: string };

const als: {
  getStore?: () => Context | undefined;
} = {};

// Optional AsyncLocalStorage store injection (set via setPerfContextGetter)
export const setPerfContextGetter = (getter: () => Context | undefined) => {
  als.getStore = getter;
};

export const enableMongooseProfiling = (opts?: { slowQueryMs?: number }) => {
  if (enabled) return;
  enabled = true;

  const slowQueryMs = opts?.slowQueryMs ?? 300;

  mongoose.set('debug', (collectionName: string, methodName: string, ...methodArgs: any[]) => {
    // Mongoose debug hook does not provide duration; we emulate timing by wrapping model operations.
    // As a compromise, we record per-op counts and log slow queries via driver command monitoring would be better.
    // We'll still record the call and rely on driver timings captured elsewhere.

    const key = `mongo:${collectionName}.${methodName}`;
    // Best-effort 0ms here; real timing comes from mongoose query middleware below.
    recordLatency(key, 0, slowQueryMs);

    const ctx = als.getStore?.();
    if (ctx) {
      const log = withRequestContext(ctx.requestId, ctx.correlationId);
      log.debug('db.query', { collection: collectionName, method: methodName });
    }

    void methodArgs;
  });

  // Query middleware for actual durations
  mongoose.Query.prototype.exec = new Proxy(mongoose.Query.prototype.exec, {
    apply: async (target, thisArg: any, argArray: any[]) => {
      const start = Date.now();
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await Reflect.apply(target as any, thisArg, argArray);
      } finally {
        const durationMs = Date.now() - start;
        const modelName = thisArg?.model?.modelName || 'UnknownModel';
        const op = thisArg?.op || 'exec';
        const key = `mongo:${modelName}.${op}`;
        recordLatency(key, durationMs, slowQueryMs);

        if (durationMs >= slowQueryMs) {
          const ctx = als.getStore?.();
          const log = withRequestContext(ctx?.requestId, ctx?.correlationId);
          log.warn('perf.slow_query', {
            key,
            durationMs,
          });
        }
      }
    },
  }) as any;
};
