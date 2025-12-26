import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import protectedRoutes from './routes/protected';
import { errorHandler } from './middleware/errorHandler';
import { httpLoggerStream } from './utils/logger';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import { getDbDegradedState } from './db';
import { getDbRouterMetrics } from './db/router';
import { adaptiveRateLimit, getAdaptiveRateLimitState } from './middleware/adaptiveRateLimit';
import { idempotency } from './middleware/idempotency';
import cookieParser from 'cookie-parser';
import { sanitizeRequest } from './middleware/sanitize';
import { perfProfiler } from './middleware/perfProfiler';
import { perfContextMiddleware } from './middleware/perfContextMiddleware';
import perfRoutes from './routes/perf';
import { perfContext } from './perf/perfContext';
import { enableMongooseProfiling, setPerfContextGetter } from './perf/mongooseProfiler';
import systemRoutes from './routes/system';
import { freezeGuard } from './middleware/freezeGuard';
import { killSwitch } from './middleware/featureKillSwitch';

let totalRequests = 0;
let errorCount = 0;
let totalResponseTimeMs = 0;

const app: Application = express();

// enable DB profiling (query timings)
setPerfContextGetter(() => perfContext.getStore());
enableMongooseProfiling({ slowQueryMs: 300 });

app.set('trust proxy', 1);

app.use((req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const correlationId = (req.headers['x-correlation-id'] as string) || requestId;
  req.requestId = requestId;
  req.correlationId = correlationId;
  res.setHeader('x-request-id', requestId);
  res.setHeader('x-correlation-id', correlationId);
  next();
});

// bind request context for db profiling logs
app.use(perfContextMiddleware());

app.disable('x-powered-by');
app.use(helmet());

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

app.use(cookieParser());

// JSON body limit 100kb
app.use(bodyParser.json({ limit: '100kb' }));

// Prevent NoSQL injection / operator injection in body + query
app.use(sanitizeRequest());

// Request handler profiling
app.use(perfProfiler({ slowMs: 300 }));

// disable caching for auth responses
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/api/v1') || req.path.startsWith('/api/v2')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  next();
});

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

app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms :remote-addr', {
    stream: httpLoggerStream,
  }),
);

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Day 14 - Mongo Auth API',
    docs: '/docs',
    versions: {
      v1: '/api/v1',
      v2: '/api/v2',
    },
  });
});

// Liveness: OK if we can still serve some (read-only) operations.
app.get('/health', (_req: Request, res: Response) => {
  const db = getDbDegradedState();
  if (!db.canRead) {
    // still do not crash; return "ok" with degraded=false? but keep it OK only if read-only ops are possible.
    res.status(503).json({ status: 'degraded', canRead: false, canWrite: false, db, uptime: process.uptime() });
    return;
  }
  res.json({ status: 'ok', canRead: db.canRead, canWrite: db.canWrite, db, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Readiness gate: set to false when SIGTERM shutdown begins
let isShuttingDown = false;
export const markShuttingDown = (): void => {
  isShuttingDown = true;
};

// Ready: must be able to write (i.e., primary reachable) for auth to be considered ready.
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
    mongooseState: mongoose.connection.readyState,
  });
});

app.get('/metrics', (_req: Request, res: Response) => {
  const avgResponseTime = totalRequests ? totalResponseTimeMs / totalRequests : 0;
  res.json({ totalRequests, errorCount, avgResponseTimeMs: avgResponseTime });
});

// Day 28 scale metrics (JSON):
app.get('/metrics/ha', (_req: Request, res: Response) => {
  const db = getDbDegradedState();
  res.json({
    service: 'auth-service',
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
  res.json({ service: 'auth-service', ...db, router });
});

app.get('/metrics/cache', (_req: Request, res: Response) => {
  // auth service intentionally disables caching; still expose endpoint for uniform dashboards.
  res.json({
    service: 'auth-service',
    l1: { hits: 0, misses: 0 },
    l2: { hits: 0, misses: 0 },
    note: 'auth-service caching disabled by design',
  });
});

// Perf metrics
app.use('/metrics', perfRoutes);

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v2/auth', authRoutes);

// backward compatibility
app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

app.use(errorHandler);

// Adaptive rate limiting (works alongside any existing static rate limiters).
app.use(adaptiveRateLimit());

// Observability: adaptive limiter state
app.get('/metrics/limits', (_req: Request, res: Response) => {
  res.json({ service: 'auth-service', ...getAdaptiveRateLimitState() });
});

// Kill-switch framework (dynamic)
app.use(
  killSwitch({
    'auth.register': (req) => req.path.endsWith('/register') && req.method === 'POST',
    'auth.login': (req) => req.path.endsWith('/login') && req.method === 'POST',
    'auth.refresh': (req) => req.path.endsWith('/refresh') && req.method === 'POST',
    'auth.logout': (req) => req.path.endsWith('/logout') && req.method === 'POST',
  }),
);

// Global freeze (blocks all writes)
app.use(
  freezeGuard({
    allowListPaths: ['/api/system'],
  }),
);

// System controls (admin-only)
app.use('/api/system', systemRoutes);

export default app;
