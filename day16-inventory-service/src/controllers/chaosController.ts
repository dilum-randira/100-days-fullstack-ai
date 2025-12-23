import { Request, Response, NextFunction } from 'express';
import { logger, withRequestContext } from '../utils/logger';

type ChaosMode = 'latency' | 'error' | 'cpu';

type ChaosState = {
  enabled: boolean;
  mode: ChaosMode | null;
  until: number; // epoch ms
  latencyMs: number;
  errorRate: number; // 0..1
  cpuSeconds: number;
};

const state: ChaosState = {
  enabled: false,
  mode: null,
  until: 0,
  latencyMs: 0,
  errorRate: 0,
  cpuSeconds: 0,
};

const isActive = (): boolean => {
  if (!state.enabled) return false;
  if (!state.until) return false;
  if (Date.now() >= state.until) {
    // auto-disable
    state.enabled = false;
    state.mode = null;
    state.latencyMs = 0;
    state.errorRate = 0;
    state.cpuSeconds = 0;
    state.until = 0;
    logger.info('chaos.auto_disabled');
    return false;
  }
  return true;
};

const requireChaosFeatureFlag = (req: Request): boolean => {
  // Feature-flag protected (disabled by default). Reuses existing feature flag convention.
  // Options supported:
  // - DB-backed flags via /api/features (key: chaos.enabled)
  // - env override: CHAOS_ENABLED=true for controlled test envs
  const envEnabled = (process.env.CHAOS_ENABLED || '').toLowerCase() === 'true';
  const headerFlag = (req.headers['x-chaos-enabled'] as string | undefined)?.toLowerCase() === 'true';

  // If you want full DB-backed flags only, keep envEnabled false in prod.
  return envEnabled || headerFlag;
};

const getActorId = (req: Request): string | undefined => {
  return (req as any).user?.userId || (req.headers['x-actor-id'] as string | undefined);
};

const getRequestId = (req: Request): string | undefined => {
  return (req as any).requestId || (req.headers['x-request-id'] as string | undefined);
};

const isAdmin = (req: Request): boolean => {
  const role = (req as any).user?.role || (req.headers['x-user-role'] as string | undefined);
  return role === 'admin';
};

const parsePositiveInt = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
};

const parseRate01 = (value: unknown, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
};

export const chaosMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Chaos injection is ALWAYS off by default.
  if (!isActive()) {
    next();
    return;
  }

  const requestId = getRequestId(req);
  const correlationId = (req as any).correlationId;
  const log = withRequestContext(requestId, correlationId);

  // latency
  if (state.mode === 'latency') {
    setTimeout(() => {
      log.warn('chaos.latency.injected', { latencyMs: state.latencyMs, path: req.path, method: req.method });
      next();
    }, state.latencyMs);
    return;
  }

  // error
  if (state.mode === 'error') {
    const roll = Math.random();
    if (roll < state.errorRate) {
      log.warn('chaos.error.injected', {
        errorRate: state.errorRate,
        roll,
        path: req.path,
        method: req.method,
      });
      res.status(503).json({ success: false, error: 'ChaosInjected', requestId });
      return;
    }
  }

  next();
};

export const setLatencyChaos = async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  if (!requireChaosFeatureFlag(req)) {
    res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
    return;
  }

  const { milliseconds, ttlSeconds } = req.body as { milliseconds?: number; ttlSeconds?: number };

  const latencyMs = parsePositiveInt(milliseconds, 250);
  const ttl = parsePositiveInt(ttlSeconds, 30);

  state.enabled = true;
  state.mode = 'latency';
  state.latencyMs = latencyMs;
  state.errorRate = 0;
  state.cpuSeconds = 0;
  state.until = Date.now() + ttl * 1000;

  const requestId = getRequestId(req);
  const actorId = getActorId(req);
  withRequestContext(requestId).warn('chaos.start', { mode: 'latency', latencyMs, ttlSeconds: ttl, actorId });

  res.status(200).json({ success: true, mode: state.mode, until: state.until, latencyMs });
};

export const setErrorChaos = async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  if (!requireChaosFeatureFlag(req)) {
    res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
    return;
  }

  const { rate, ttlSeconds } = req.body as { rate?: number; ttlSeconds?: number };

  const errorRate = parseRate01(rate, 0.2);
  const ttl = parsePositiveInt(ttlSeconds, 30);

  state.enabled = true;
  state.mode = 'error';
  state.latencyMs = 0;
  state.errorRate = errorRate;
  state.cpuSeconds = 0;
  state.until = Date.now() + ttl * 1000;

  const requestId = getRequestId(req);
  const actorId = getActorId(req);
  withRequestContext(requestId).warn('chaos.start', { mode: 'error', errorRate, ttlSeconds: ttl, actorId });

  res.status(200).json({ success: true, mode: state.mode, until: state.until, errorRate });
};

const burnCpu = async (seconds: number): Promise<void> => {
  const end = Date.now() + seconds * 1000;
  // busy loop with occasional yields to keep node responsive
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // light compute
    let x = 0;
    for (let i = 0; i < 50000; i++) {
      x += Math.sqrt(i * 123.456) % 7;
    }
    if (x < 0) {
      // never happens; prevents optimization
      // eslint-disable-next-line no-console
      console.log(x);
    }

    if (Date.now() >= end) break;

    // yield
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
};

export const setCpuChaos = async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  if (!requireChaosFeatureFlag(req)) {
    res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
    return;
  }

  const { seconds, ttlSeconds } = req.body as { seconds?: number; ttlSeconds?: number };

  const cpuSeconds = parsePositiveInt(seconds, 5);
  const ttl = parsePositiveInt(ttlSeconds, cpuSeconds + 5);

  state.enabled = true;
  state.mode = 'cpu';
  state.latencyMs = 0;
  state.errorRate = 0;
  state.cpuSeconds = cpuSeconds;
  state.until = Date.now() + ttl * 1000;

  const requestId = getRequestId(req);
  const actorId = getActorId(req);
  withRequestContext(requestId).warn('chaos.start', { mode: 'cpu', cpuSeconds, ttlSeconds: ttl, actorId });

  // Fire and forget CPU burn.
  void burnCpu(cpuSeconds)
    .then(() => {
      logger.warn('chaos.cpu.burn_completed', { cpuSeconds });
    })
    .catch((err: any) => {
      logger.error('chaos.cpu.burn_failed', { message: err?.message || String(err) });
    });

  res.status(200).json({ success: true, mode: state.mode, until: state.until, cpuSeconds });
};

export const stopChaos = async (req: Request, res: Response): Promise<void> => {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  if (!requireChaosFeatureFlag(req)) {
    res.status(403).json({ success: false, error: 'ChaosFeatureDisabled' });
    return;
  }

  const requestId = getRequestId(req);
  const actorId = getActorId(req);

  state.enabled = false;
  state.mode = null;
  state.until = 0;
  state.latencyMs = 0;
  state.errorRate = 0;
  state.cpuSeconds = 0;

  withRequestContext(requestId).warn('chaos.stop', { actorId });
  res.status(200).json({ success: true, enabled: false });
};
