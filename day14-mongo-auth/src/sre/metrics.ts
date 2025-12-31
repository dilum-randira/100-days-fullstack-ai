import { logger } from '../utils/logger';

// Simple in-memory SLI collector. Approximations only.

type LatencySample = { ts: number; ms: number };

const MAX_SAMPLES = 5000;
const WINDOW_MS = Number(process.env.SLO_WINDOW_MS || String(24 * 60 * 60 * 1000)); // default 24h

let totalRequests = 0;
let totalErrors = 0; // 5xx
let samples: LatencySample[] = [];

export const recordRequest = (durationMs: number, statusCode: number): void => {
  totalRequests += 1;
  if (statusCode >= 500) totalErrors += 1;
  // collect latency sample
  samples.push({ ts: Date.now(), ms: durationMs });
  if (samples.length > MAX_SAMPLES) samples.shift();
};

export const resetMetrics = (): void => {
  totalRequests = 0;
  totalErrors = 0;
  samples = [];
};

const prune = (): void => {
  const cutoff = Date.now() - WINDOW_MS;
  while (samples.length && samples[0].ts < cutoff) samples.shift();
};

export const getSLI = () => {
  prune();
  const req = totalRequests;
  const err = totalErrors;
  const availability = req === 0 ? 100 : Math.max(0, 100 * (1 - err / req));

  const latSamples = samples.map((s) => s.ms).slice(-MAX_SAMPLES);
  const p95 = computePercentile(latSamples, 95);

  return {
    totalRequests: req,
    totalErrors: err,
    availability,
    latencyP95Ms: p95,
    sampleCount: latSamples.length,
  };
};

export const computePercentile = (arr: number[], p: number): number => {
  if (!arr || arr.length === 0) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
};

export const debugLog = () => {
  logger.info('sli.debug', getSLI());
};
