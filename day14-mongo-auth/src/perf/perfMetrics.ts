export type PerfSummary = {
  count: number;
  minMs: number;
  maxMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  slowCount: number;
};

type Entry = {
  count: number;
  slowCount: number;
  ring: Float64Array;
  idx: number;
  filled: number;
  sumMs: number;
  minMs: number;
  maxMs: number;
};

const MAX_SAMPLES = 2048;

const state = new Map<string, Entry>();

const getEntry = (key: string): Entry => {
  let e = state.get(key);
  if (!e) {
    e = {
      count: 0,
      slowCount: 0,
      ring: new Float64Array(MAX_SAMPLES),
      idx: 0,
      filled: 0,
      sumMs: 0,
      minMs: Number.POSITIVE_INFINITY,
      maxMs: 0,
    };
    state.set(key, e);
  }
  return e;
};

export const recordLatency = (key: string, ms: number, slowThresholdMs: number): void => {
  const e = getEntry(key);
  e.count += 1;
  e.sumMs += ms;
  if (ms < e.minMs) e.minMs = ms;
  if (ms > e.maxMs) e.maxMs = ms;
  if (ms >= slowThresholdMs) e.slowCount += 1;

  e.ring[e.idx] = ms;
  e.idx = (e.idx + 1) % e.ring.length;
  if (e.filled < e.ring.length) e.filled += 1;
};

const percentile = (values: number[], p: number): number => {
  if (!values.length) return 0;
  const idx = Math.min(values.length - 1, Math.max(0, Math.floor(p * (values.length - 1))));
  return values[idx];
};

export const snapshotPerf = (): Record<string, PerfSummary> => {
  const out: Record<string, PerfSummary> = {};

  for (const [key, e] of state.entries()) {
    const n = e.filled;
    const samples: number[] = [];
    samples.length = n;

    // read ring buffer without allocating intermediate arrays per push
    const start = e.filled === e.ring.length ? e.idx : 0;
    for (let i = 0; i < n; i++) {
      const ri = (start + i) % e.ring.length;
      samples[i] = e.ring[ri];
    }
    samples.sort((a, b) => a - b);

    out[key] = {
      count: e.count,
      minMs: Number.isFinite(e.minMs) ? e.minMs : 0,
      maxMs: e.maxMs,
      avgMs: e.count ? e.sumMs / e.count : 0,
      p50Ms: percentile(samples, 0.5),
      p95Ms: percentile(samples, 0.95),
      p99Ms: percentile(samples, 0.99),
      slowCount: e.slowCount,
    };
  }

  return out;
};

export const resetPerf = (): void => {
  state.clear();
};
