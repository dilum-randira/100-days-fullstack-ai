import express from 'express';
import { config } from './config';
import { connectDB, getDbDegradedState } from './db';
import { getDbRouterMetrics } from './db/router';
import routes from './routes';
import http from 'http';
import mongoose from 'mongoose';

const app = express();

app.use(express.json());

let isShuttingDown = false;

app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) || undefined;
  const correlationId = (req.headers['x-correlation-id'] as string) || requestId;

  (req as any).requestId = requestId;
  (req as any).correlationId = correlationId;

  if (requestId) res.setHeader('x-request-id', requestId);
  if (correlationId) res.setHeader('x-correlation-id', correlationId);

  next();
});

// Liveness: OK if analytics reads are possible (secondaryPreferred).
app.get('/health', (_req, res) => {
  const db = getDbDegradedState();
  if (!db.canRead) {
    res.status(503).json({ status: 'degraded', canRead: false, canWrite: false, db, uptime: process.uptime() });
    return;
  }
  res.json({ status: 'ok', canRead: db.canRead, canWrite: db.canWrite, db, uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Readiness (fails during shutdown) - analytics can be ready if reads work.
app.get('/ready', (_req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ ready: false, shuttingDown: true });
    return;
  }

  const db = getDbDegradedState();
  const ready = db.canRead;
  res.status(ready ? 200 : 503).json({ ready, degraded: false, db, state: mongoose.connection.readyState });
});

// Metrics endpoints
app.get('/metrics/ha', (_req, res) => {
  const db = getDbDegradedState();
  res.json({
    service: 'analytics-service',
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

app.get('/metrics/db', (_req, res) => {
  const db = getDbDegradedState();
  const router = getDbRouterMetrics();
  res.json({ service: 'analytics-service', ...db, router });
});

app.get('/metrics/cache', (_req, res) => {
  // analytics-service is DB-only in this repo; endpoint included for uniform dashboards.
  res.json({ service: 'analytics-service', l1: { hits: 0, misses: 0 }, l2: { hits: 0, misses: 0 } });
});

app.use('/api/analytics', routes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'InternalServerError' });
});

const start = async (): Promise<void> => {
  await connectDB();

  const server = http.createServer(app);
  const connections = new Set<import('net').Socket>();

  server.on('connection', (socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Analytics service listening on port ${config.port}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('analytics.shutdown.initiated', { signal });

    server.close((err?: Error) => {
      if (err) console.error('analytics.shutdown.http_error', { message: err.message });
      else console.log('analytics.shutdown.http_closed');
    });

    const drainTimeoutMs = Number(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS || 25000);
    const t = setTimeout(() => {
      console.log('analytics.shutdown.force_close_connections', { openConnections: connections.size });
      for (const socket of connections) socket.destroy();
    }, drainTimeoutMs);
    (t as any).unref?.();

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log('analytics.shutdown.db_closed');
      }
    } catch (err: any) {
      console.error('analytics.shutdown.db_error', { message: err?.message || String(err) });
    }

    const done = setTimeout(() => process.exit(0), 250);
    (done as any).unref?.();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('Failed to start analytics service', err);
  process.exit(1);
});
