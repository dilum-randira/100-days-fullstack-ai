if (isCircuitOpen()) {
  logger.warn('analytics.client.circuit_open');
  return null; // fallback to cache or safe default
}

try {
  const response = await withRetry(...);
  recordSuccess();
  return response.data;
} catch (err) {
  recordFailure();
  // log + return null
}if (isCircuitOpen()) {
  logger.warn('analytics.client.circuit_open');
  return null; // fallback to cache or safe default
}

try {
  const response = await withRetry(...);
  recordSuccess();
  return response.data;
} catch (err) {
  recordFailure();
  // log + return null
}type RouteKey = string;

interface RouteMetrics {
  count: number;
  errors: number;
  totalDurationMs: number;
}

const routes: Record<RouteKey, RouteMetrics> = {};

export const recordRequest = (key: string, durationMs: number, error: boolean) => {
  const m = (routes[key] ??= { count: 0, errors: 0, totalDurationMs: 0 });
  m.count += 1;
  if (error) m.errors += 1;
  m.totalDurationMs += durationMs;
};

export const getMetricsSnapshot = () => {
  const snapshot: Record<string, { count: number; errors: number; avgMs: number }> = {};
  for (const [key, m] of Object.entries(routes)) {
    snapshot[key] = {
      count: m.count,
      errors: m.errors,
      avgMs: m.count ? Number((m.totalDurationMs / m.count).toFixed(2)) : 0,
    };
  }
  return snapshot;
};export interface BenchmarkStats {
  requestsHandled: number;
  totalDurationMs: number;
  maxResponseTime: number;
  errors: number;
}

const makeStats = (): BenchmarkStats => ({
  requestsHandled: 0,
  totalDurationMs: 0,
  maxResponseTime: 0,
  errors: 0,
});

const readStats: BenchmarkStats = makeStats();
const writeStats: BenchmarkStats = makeStats();

const updateStats = (stats: BenchmarkStats, durationMs: number, error: boolean) => {
  stats.requestsHandled += 1;
  stats.totalDurationMs += durationMs;
  if (durationMs > stats.maxResponseTime) stats.maxResponseTime = durationMs;
  if (error) stats.errors += 1;
};

export const recordReadBenchmark = (durationMs: number, error: boolean) =>
  updateStats(readStats, durationMs, error);

export const recordWriteBenchmark = (durationMs: number, error: boolean) =>
  updateStats(writeStats, durationMs, error);

export const getReadBenchmarkSnapshot = () => ({
  requestsHandled: readStats.requestsHandled,
  averageResponseTime:
    readStats.requestsHandled === 0
      ? 0
      : Number((readStats.totalDurationMs / readStats.requestsHandled).toFixed(2)),
  maxResponseTime: readStats.maxResponseTime,
  errorRate:
    readStats.requestsHandled === 0
      ? 0
      : Number((readStats.errors / readStats.requestsHandled).toFixed(4)),
});

export const getWriteBenchmarkSnapshot = () => ({
  requestsHandled: writeStats.requestsHandled,
  averageResponseTime:
    writeStats.requestsHandled === 0
      ? 0
      : Number((writeStats.totalDurationMs / writeStats.requestsHandled).toFixed(2)),
  maxResponseTime: writeStats.maxResponseTime,
  errorRate:
    writeStats.requestsHandled === 0
      ? 0
      : Number((writeStats.errors / writeStats.requestsHandled).toFixed(4)),
});import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

const isAdmin = (req: Request): boolean => {
  const role = (req as any).user?.role || (req.headers['x-user-role'] as string | undefined);
  return role === 'admin' || role === 'superadmin';
};

export const benchmarkAdminGuard = (req: Request, res: Response, next: NextFunction): void => {
  if (!isAdmin(req)) {
    res.status(403).json({ success: false, error: 'Forbidden' });
    return;
  }
  next();
};

export const benchmarkRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 benchmark calls per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
});import { Router, Request, Response, NextFunction } from 'express';
import { listItems } from '../services/inventoryService';
import { adjustQuantity } from '../services/inventoryService';
import {
  recordReadBenchmark,
  recordWriteBenchmark,
  getReadBenchmarkSnapshot,
  getWriteBenchmarkSnapshot,
} from '../services/benchmarkMetrics';
import { benchmarkAdminGuard, benchmarkRateLimiter } from '../middleware/benchmarkGuard';

const router = Router();

// GET /api/benchmark/inventory-read
router.get(
  '/inventory-read',
  benchmarkRateLimiter,
  benchmarkAdminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    let error = false;

    try {
      const { page, limit } = req.query;

      // Use small, fixed pagination to simulate read-heavy load safely
      const result = await listItems(
        {
          productName: undefined,
          supplier: undefined,
          location: undefined,
          includeDeleted: false,
        },
        {
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20,
        },
      );

      const durationMs = Date.now() - start;
      recordReadBenchmark(durationMs, false);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
        },
        metrics: getReadBenchmarkSnapshot(),
      });
    } catch (err) {
      error = true;
      const durationMs = Date.now() - start;
      recordReadBenchmark(durationMs, true);
      next(err);
    }
  },
);

// GET /api/benchmark/inventory-write
router.get(
  '/inventory-write',
  benchmarkRateLimiter,
  benchmarkAdminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    let error = false;

    try {
      const { id } = req.query;
      const itemId = id as string | undefined;

      if (!itemId) {
        res.status(400).json({ success: false, error: 'Missing item id query param' });
        return;
      }

      // Controlled write: apply a +1 and then a -1, ending with same quantity
      await adjustQuantity(itemId, 1);
      await adjustQuantity(itemId, -1);

      const durationMs = Date.now() - start;
      recordWriteBenchmark(durationMs, false);

      res.status(200).json({
        success: true,
        message: 'Write benchmark cycle completed',
        metrics: getWriteBenchmarkSnapshot(),
      });
    } catch (err) {
      error = true;
      const durationMs = Date.now() - start;
      recordWriteBenchmark(durationMs, true);
      next(err);
    }
  },
);

export default router;import benchmarkRouter from './routes/benchmark';

// ...existing app setup...

app.use('/api/benchmark', benchmarkRouter);import autocannon from 'autocannon';
import fs from 'fs';
import path from 'path';

interface TargetConfig {
  url: string;
  method: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
}

const INVENTORY_READ_TARGET: TargetConfig = {
  url: process.env.BENCHMARK_READ_URL || 'http://localhost:3000/api/benchmark/inventory-read',
  method: 'GET',
};

const INVENTORY_WRITE_TARGET: TargetConfig = {
  url: process.env.BENCHMARK_WRITE_URL || 'http://localhost:3000/api/benchmark/inventory-write?id=ITEM_ID',
  method: 'GET',
};

const runTest = async (name: string, target: TargetConfig) =>
  new Promise<autocannon.Result>((resolve, reject) => {
    const instance = autocannon(
      {
        url: target.url,
        method: target.method,
        headers: target.headers,
        body: target.body,
        connections: Number(process.env.LT_CONNECTIONS || 20),
        amount: Number(process.env.LT_REQUESTS || 200),
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      },
    );

    autocannon.track(instance, { renderProgressBar: true });
  });

const saveResult = (name: string, result: autocannon.Result) => {
  const outDir = process.env.LT_OUTPUT_DIR || 'load-results';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const file = path.join(outDir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2), 'utf8');
  console.log(`Saved ${name} result to ${file}`);
};

(async () => {
  try {
    console.log('Running inventory-read benchmark...');
    const readRes = await runTest('inventory-read', INVENTORY_READ_TARGET);
    saveResult('inventory-read', readRes);

    console.log('Running inventory-write benchmark...');
    const writeRes = await runTest('inventory-write', INVENTORY_WRITE_TARGET);
    saveResult('inventory-write', writeRes);

    console.log('Load tests completed');
  } catch (err: any) {
    console.error('Load test failed', err.message || err);
    process.exit(1);
  }
})();{
  "requestsHandled": 10,
  "averageResponseTime": 12.34,
  "maxResponseTime": 40,
  "errorRate": 0.01
}import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production';

const parsePort = (value: string | undefined, fallback: number): number => {
  const num = value ? Number(value) : NaN;
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const rawNodeEnv: NodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const port = parsePort(process.env.PORT, 4000);
const mongoUri = required('MONGO_URI', process.env.MONGO_URI);
const jwtAccessSecret = required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
const jwtRefreshSecret = required('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
const redisUrl = required('REDIS_URL', process.env.REDIS_URL);

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  mongoUri: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  redisUrl: string;
}

export const config: AppConfig = {
  port,
  nodeEnv: rawNodeEnv,
  mongoUri,
  jwt: {
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
  },
  redisUrl,
};
