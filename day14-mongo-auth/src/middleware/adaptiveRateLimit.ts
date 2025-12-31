import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

export type LimitTier = 'normal' | 'tight' | 'severe';

type Rolling = {
  count: number;
  startedAtMs: number;
};

type AdaptiveState = {
  tier: LimitTier;
  lastTierChangeAtMs: number;
  // global telemetry
  windowMs: number;
  req: Rolling;
  err5xx: Rolling;
  latency: { sumMs: number; samples: number; startedAtMs: number };
  // per-endpoint group request counters for heavier throttling
  groupReq: Record<string, Rolling>;
  // rate limit decisions
  decisions: { allowed: number; blocked: number };
};

const state: AdaptiveState = {
  tier: 'normal',
  lastTierChangeAtMs: Date.now(),
  windowMs: 10_000,
  req: { count: 0, startedAtMs: Date.now() },
  err5xx: { count: 0, startedAtMs: Date.now() },
  latency: { sumMs: 0, samples: 0, startedAtMs: Date.now() },
  groupReq: {},
  decisions: { allowed: 0, blocked: 0 },
};

const resetRolling = (r: Rolling): void => {
  r.count = 0;
  r.startedAtMs = Date.now();
};

const getRollingRatePerSec = (r: Rolling): number => {
  const elapsedMs = Math.max(1, Date.now() - r.startedAtMs);
  return (r.count / elapsedMs) * 1000;
};

const getAvgLatencyMs = (): number => {
  const elapsedMs = Date.now() - state.latency.startedAtMs;
  if (elapsedMs > state.windowMs) {
    state.latency.sumMs = 0;
    state.latency.samples = 0;
    state.latency.startedAtMs = Date.now();
    return 0;
  }
  return state.latency.samples ? state.latency.sumMs / state.latency.samples : 0;
};

const normalizeGroup = (path: string): 'heavy' | 'default' | 'admin' => {
  const p = path.toLowerCase();
  if (p.startsWith('/api/chaos') || p.startsWith('/docs') || p.startsWith('/api/features')) return 'admin';
  if (p.includes('/api/analytics') || p.includes('/export') || p.includes('/summary') || p.includes('/top') || p.includes('/trending')) {
    return 'heavy';
  }
  return 'default';
};

const ensureGroup = (g: string): Rolling => {
  if (!state.groupReq[g]) state.groupReq[g] = { count: 0, startedAtMs: Date.now() };
  return state.groupReq[g];
};

let overrideTier: LimitTier | null = null;

export const setAdaptiveTierOverride = (tier: LimitTier | null): void => {
  overrideTier = tier;
};

export const getAdaptiveTierOverride = (): LimitTier | null => overrideTier;

const computeTier = (): LimitTier => {
  if (overrideTier) return overrideTier;

  // reset windows if necessary
  if (Date.now() - state.req.startedAtMs > state.windowMs) resetRolling(state.req);
  if (Date.now() - state.err5xx.startedAtMs > state.windowMs) resetRolling(state.err5xx);

  const rps = getRollingRatePerSec(state.req);
  const errRps = getRollingRatePerSec(state.err5xx);
  const avgLatency = getAvgLatencyMs();
  const errRate = state.req.count ? state.err5xx.count / state.req.count : 0;

  // Hard high-signal triggers first
  if (avgLatency >= 1200 || errRate >= 0.15 || errRps >= 1.5) return 'severe';
  if (avgLatency >= 700 || errRate >= 0.07 || rps >= 25) return 'tight';
  return 'normal';
};

const tierLimits = (tier: LimitTier) => {
  // per 10s window (state.windowMs)
  switch (tier) {
    case 'severe':
      return { default: 40, heavy: 12 };
    case 'tight':
      return { default: 80, heavy: 25 };
    default:
      return { default: 140, heavy: 40 };
  }
};

const maybeChangeTier = (): void => {
  const next = computeTier();
  if (next === state.tier) return;

  // dampen oscillation
  const sinceMs = Date.now() - state.lastTierChangeAtMs;
  if (sinceMs < 3000) return;

  const prev = state.tier;
  state.tier = next;
  state.lastTierChangeAtMs = Date.now();

  logger.warn('adaptive_limit.tier_change', {
    from: prev,
    to: next,
    windowMs: state.windowMs,
    rps: Number(getRollingRatePerSec(state.req).toFixed(2)),
    errRate: state.req.count ? Number((state.err5xx.count / state.req.count).toFixed(4)) : 0,
    avgLatencyMs: Number(getAvgLatencyMs().toFixed(2)),
  });
};

export const getAdaptiveRateLimitState = () => {
  const limits = tierLimits(state.tier);
  return {
    tier: state.tier,
    windowMs: state.windowMs,
    limits,
    telemetry: {
      rps: Number(getRollingRatePerSec(state.req).toFixed(2)),
      errorRate: state.req.count ? Number((state.err5xx.count / state.req.count).toFixed(4)) : 0,
      avgLatencyMs: Number(getAvgLatencyMs().toFixed(2)),
      reqCountWindow: state.req.count,
      err5xxCountWindow: state.err5xx.count,
    },
    decisions: { ...state.decisions },
  };
};

export const adaptiveRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const group = normalizeGroup(req.path);

    // Admin routes excluded
    if (group === 'admin') {
      next();
      return;
    }

    const start = Date.now();

    // Track request rate
    state.req.count += 1;

    // Update tier based on latest telemetry (pre-decision)
    maybeChangeTier();

    const limits = tierLimits(state.tier);
    const rolling = ensureGroup(group);

    if (Date.now() - rolling.startedAtMs > state.windowMs) resetRolling(rolling);
    rolling.count += 1;

    const limit = group === 'heavy' ? limits.heavy : limits.default;

    if (rolling.count > limit) {
      state.decisions.blocked += 1;

      const retryAfterSeconds = Math.max(1, Math.ceil((state.windowMs - (Date.now() - rolling.startedAtMs)) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));

      // debug-safe: do not leak internals like exact rps breakdown per client
      res.status(429).json({
        success: false,
        error: 'TooManyRequests',
        message: 'Rate limit exceeded',
        limitState: {
          tier: state.tier,
          windowMs: state.windowMs,
          group,
          limit,
        },
      });
      return;
    }

    state.decisions.allowed += 1;

    res.on('finish', () => {
      const duration = Date.now() - start;
      state.latency.sumMs += duration;
      state.latency.samples += 1;

      if (res.statusCode >= 500) {
        state.err5xx.count += 1;
      }

      // post-response reevaluate for spike reaction
      maybeChangeTier();
    });

    next();
  };
};
