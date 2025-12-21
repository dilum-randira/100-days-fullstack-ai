# Day 25 – Observability, Reliability & Load Testing

On Day 25, we focus on **seeing inside** our system and **trusting** it under stress. We build on the previous days’ work (auth, inventory, analytics, API gateway, AI, notifications, feature flags, multi-tenancy) and add:

- Central, structured logging and correlation IDs.
- Lightweight in-memory metrics for routes and benchmarks.
- Improved health checks and readiness.
- Safe benchmark endpoints for read/write performance.
- A repeatable load‑testing script using `autocannon`.

These changes don’t change business behavior – they improve how we **observe**, **debug**, and **stress test** the system in production‑like environments.

---

## 1. Observability Foundations

### 1.1 Structured logging & correlation IDs

Across services (auth, inventory, analytics, gateway) we already:

- Use a shared logger (Winston) with JSON logs.
- Attach a `requestId` and `correlationId` to every incoming request.
- Propagate `X-Request-Id` / `X-Correlation-Id` headers from the API gateway to downstream services.

On Day 25 we treat this as our **core observability primitive**:

- Every important log line includes `requestId` and `correlationId`.
- Cross-service calls (gateway → inventory → analytics) reuse the same correlation ID so you can follow a request across logs.
- Background work (queues, notifications) can also log the correlation ID when available.

With this in place, it becomes much easier to reconstruct incidents in logs.

---

## 2. Lightweight Metrics

We add simple in-memory metrics collectors for two use cases:

1. **Route metrics** – track how many times a route is called, how long it takes, and error counts.
2. **Benchmark metrics** – track performance of our synthetic benchmark endpoints.

Example structure for route metrics:

```ts
interface RouteMetrics {
  count: number;
  errors: number;
  totalDurationMs: number;
}

const routes: Record<string, RouteMetrics> = {};

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
};
```

This gives us instant insight such as:

- Which routes are hottest.
- Average latency per route.
- Error rates, useful to trigger alerts or investigate regressions.

> In a real production setup you’d usually export this data to Prometheus, OpenTelemetry, or a hosted APM. Here we keep it intentionally lightweight but structured so it can be swapped out later.

---

## 3. Health Checks & Readiness

We build on existing health endpoints and make a clear separation between:

- **Liveness** – “Is the process up?”
- **Readiness** – “Is the service ready to receive traffic?”

Typical checks:

- Liveness route simply responds if the Node process is running.
- Readiness route can verify:
  - MongoDB connection is established.
  - Redis is reachable.
  - Required configuration is loaded.
  - (Optional) Circuit breakers are not fully open.

This allows orchestrators (Docker, Kubernetes, or simple process managers) to:

- Kill and restart unhealthy processes.
- Only send traffic to services that are fully ready.

---

## 4. Benchmark & Load Testing

The main new feature for Day 25 is a **safe way to benchmark inventory performance** and a **script to generate load**.

### 4.1 Benchmark metrics structure

We define a simple `BenchmarkStats` structure used by read/write benchmarks:

```ts
export interface BenchmarkStats {
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
});
```

These snapshots are returned in responses to give immediate feedback during tests.

### 4.2 Benchmark endpoints

In the inventory service we add a dedicated `benchmark` router with **admin-only**, rate-limited endpoints:

- `GET /api/benchmark/inventory-read`
- `GET /api/benchmark/inventory-write`

#### Admin guard and rate limiter

```ts
import { Request, Response, NextFunction } from 'express';
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
});
```

#### Read benchmark

```ts
router.get(
  '/inventory-read',
  benchmarkRateLimiter,
  benchmarkAdminGuard,
  async (req, res, next) => {
    const start = Date.now();

    try {
      const { page, limit } = req.query;

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
      const durationMs = Date.now() - start;
      recordReadBenchmark(durationMs, true);
      next(err);
    }
  },
);
```

This endpoint:

- Uses normal `listItems` logic (pagination, filters, soft-delete rules).
- Records latency and errors into the read benchmark stats.
- Returns both data and metrics in the response.

#### Write benchmark

```ts
router.get(
  '/inventory-write',
  benchmarkRateLimiter,
  benchmarkAdminGuard,
  async (req, res, next) => {
    const start = Date.now();

    try {
      const { id } = req.query;
      const itemId = id as string | undefined;

      if (!itemId) {
        res.status(400).json({ success: false, error: 'Missing item id query param' });
        return;
      }

      // Controlled write: apply a +1 and then a -1, ending with the same quantity
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
      const durationMs = Date.now() - start;
      recordWriteBenchmark(durationMs, true);
      next(err);
    }
  },
);
```

Key design choices:

- **Safe writes** – The `+1` / `-1` pattern ensures the final quantity is unchanged, so you can run this against non-production data without corrupting inventory totals.
- **Admin-only** – Only admin/superadmin users (or requests with `x-user-role` header) can hit these endpoints.
- **Rate-limited** – Prevents accidental or malicious overload from the benchmark endpoints alone.

---

## 5. Load Testing Script (`autocannon`)

To drive real load, we add a Node script using [`autocannon`](https://github.com/mcollina/autocannon).

High-level flow:

1. Define target URLs for the benchmark endpoints:
   - `BENCHMARK_READ_URL` (defaults to `http://localhost:3000/api/benchmark/inventory-read`).
   - `BENCHMARK_WRITE_URL` (defaults to `http://localhost:3000/api/benchmark/inventory-write?id=ITEM_ID`).
2. Run `autocannon` for each target with configurable:
   - `LT_CONNECTIONS` (concurrent connections, default 20).
   - `LT_REQUESTS` (total requests, default 200).
3. Save the raw results to `load-results/*.json` for later analysis.

Example implementation:

```ts
import autocannon from 'autocannon';
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
})();
```

### Running the load tests

Install `autocannon` in the relevant project (for example, the inventory service or a root scripts project):

```bash
npm install --save-dev autocannon
```

Then add an npm script, e.g. in `package.json`:

```json
{
  "scripts": {
    "load:test": "ts-node ./scripts/loadTest.ts"
  }
}
```

Run:

```bash
npm run load:test
```

You’ll see:

- Progress bars in the terminal.
- JSON files in `load-results/` containing detailed latency and throughput stats.

You can commit these JSON files or use them to compare performance between commits or branches.

---

## 6. How This Fits Into the 100‑Day Journey

By Day 25 we now have:

- A secure, multi-tenant, feature-flagged backend.
- AI inference endpoints, async notifications, and real-time updates.
- A dedicated analytics microservice and API gateway.
- Distributed tracing via correlation IDs.
- Soft delete, exports, and MongoDB transactions.
- And now: **observability and load testing primitives**.

This day is about treating your backend as a **living system**:

- You can **see** what it’s doing (logs + metrics).
- You can **tell** when it’s healthy or overloaded (health/readiness + error rates).
- You can **experiment** safely (benchmark endpoints + load tests).

From here, it’s natural to plug in full observability stacks (Prometheus, Grafana, OpenTelemetry, Sentry, etc.) or to experiment with chaos engineering techniques – but the core foundations are already in place.
