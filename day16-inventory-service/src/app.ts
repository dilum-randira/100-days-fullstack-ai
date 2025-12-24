import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import inventoryRouter from './routes/inventory';
import aiRouter from './routes/ai';
import featureRoutes from './routes/features';
import { errorHandler } from './middlewares/errorHandler';
import { httpLoggerStream } from './utils/logger';
import mongoose from 'mongoose';
import './events/listeners';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import chaosRouter from './routes/chaos';
import { chaosMiddleware } from './controllers/chaosController';
import { shardKeyMiddleware } from './middleware/shardKey';
import { requestIdMiddleware } from './middleware/requestId';
import { idempotency } from './middleware/idempotency';
import { getDbDegradedState } from './db';
import { getCacheStats } from './utils/cache/cache';
import { getDbRouterMetrics } from './db/router';
import { adaptiveRateLimit, getAdaptiveRateLimitState } from './middleware/adaptiveRateLimit';
import outboxMetricsRouter from './outbox/metricsRoutes';

// simple in-memory metrics
let totalRequests = 0;
let errorCount = 0;
let totalResponseTimeMs = 0;

const app: Application = express();

app.set('trust proxy', 1);

// security headers
app.disable('x-powered-by');
app.use(helmet());

// CORS with strict allowlist
const rawOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowlist = rawOrigins;

if (process.env.NODE_ENV === 'production') {
  if (!allowlist.length || allowlist.includes('*')) {
    throw new Error('In production, CORS_ORIGINS must be set to specific origins and cannot include *');
  }
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (allowlist.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

// JSON body limit 100kb
app.use(bodyParser.json({ limit: '100kb' }));

// Request/Correlation IDs (must run before idempotency logging)
app.use(requestIdMiddleware);

// Shard key extraction (tenant routing)
app.use(shardKeyMiddleware);

// Chaos middleware (disabled by default; feature-flag protected)
app.use(chaosMiddleware);

// metrics middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  totalRequests += 1;

  res.on('finish', () => {
    const duration = Date.now() - start;
    totalResponseTimeMs += duration;
    if (res.statusCode >= 500) {
      errorCount += 1;
    }
  });

  next();
});

// HTTP logging via morgan -> winston
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr', {
    stream: httpLoggerStream,
  }),
);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Day 16 - Inventory Service',
    docs: '/docs',
    versions: {
      v1: '/api/v1',
      v2: '/api/v2',
    },
  });
});

// Liveness: OK if read-only operations are possible.
app.get('/health', (_req: Request, res: Response) => {
  const db = getDbDegradedState();
  if (!db.canRead) {
    res.status(503).json({ status: 'degraded', canRead: false, canWrite: false, db, uptime: process.uptime() });
    return;
  }
  res.json({ status: 'ok', canRead: db.canRead, canWrite: db.canWrite, db, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Readiness gate: flipped off during SIGTERM shutdown to stop K8s routing traffic.
let isShuttingDown = false;
export const markShuttingDown = (): void => {
  isShuttingDown = true;
};

// Ready: inventory requires writes to be safe for mutations and queue workload.
app.get('/ready', (_req: Request, res: Response) => {
  if (isShuttingDown) {
    res.status(503).json({ ready: false, shuttingDown: true });
    return;
  }

  const db = getDbDegradedState();
  const ready = db.canWrite;

  res.status(ready ? 200 : 503).json({
    ready,
    degraded: db.canRead && !db.canWrite,
    db,
    state: mongoose.connection.readyState,
  });
});

app.get('/metrics', (_req: Request, res: Response) => {
  const avgResponseTime = totalRequests ? totalResponseTimeMs / totalRequests : 0;
  res.json({
    totalRequests,
    errorCount,
    avgResponseTimeMs: avgResponseTime,
  });
});

// Day 28 scale metrics (JSON)
app.get('/metrics/ha', (_req: Request, res: Response) => {
  const db = getDbDegradedState();
  res.json({
    service: 'inventory-service',
    db: {
      primaryAvailable: db.canWrite,
      readOnlyAvailable: db.canRead,
      failover: {
        lastDisconnectedAt: db.lastDisconnectedAt,
        lastReconnectedAt: db.lastReconnectedAt,
        lastError: db.lastError,
      },
    },
  });
});

app.get('/metrics/db', (_req: Request, res: Response) => {
  const db = getDbDegradedState();
  const router = getDbRouterMetrics();
  res.json({ service: 'inventory-service', ...db, router });
});

app.get('/metrics/cache', (_req: Request, res: Response) => {
  res.json({ service: 'inventory-service', ...getCacheStats() });
});

app.use(outboxMetricsRouter);

app.use(adaptiveRateLimit());

app.get('/metrics/limits', (_req: Request, res: Response) => {
  res.json({ service: 'inventory-service', ...getAdaptiveRateLimitState() });
});

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Admin-only chaos endpoints (protected in controller)
app.use('/api/chaos', chaosRouter);

app.use('/api/ai', aiRouter);

// Idempotency protected routes (do NOT change response formats)
app.use('/api/v1/inventory/:id/adjust', idempotency({ required: true }));
app.use('/api/v2/inventory/:id/adjust', idempotency({ required: true }));
app.use('/api/inventory/:id/adjust', idempotency({ required: true }));

app.use('/api/v1/inventory/qc/webhook', idempotency({ required: true }));
app.use('/api/v2/inventory/qc/webhook', idempotency({ required: true }));
app.use('/api/inventory/qc/webhook', idempotency({ required: true }));

app.use('/api/v1/inventory/export', idempotency({ required: true }));
app.use('/api/v2/inventory/export', idempotency({ required: true }));
app.use('/api/inventory/export', idempotency({ required: true }));

// API versioning
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v2/inventory', inventoryRouter);

// keep backward compatibility for now
app.use('/api/inventory', inventoryRouter);

app.use('/api/features', featureRoutes);

// error handler last
app.use(errorHandler);

export default app;
