import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import inventoryRouter from './routes/inventory';
import { errorHandler } from './middlewares/errorHandler';
import { httpLoggerStream, logger } from './utils/logger';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

// simple in-memory metrics
let totalRequests = 0;
let errorCount = 0;
let totalResponseTimeMs = 0;

const app: Application = express();

// attach requestId as early as possible
app.use((req: Request & { requestId?: string }, _res: Response, next: NextFunction) => {
  req.requestId = randomUUID();
  next();
});

// security headers
app.disable('x-powered-by');
app.use(helmet());

// CORS with allowlist from env
const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : '*',
    credentials: true,
  }),
);

app.use(bodyParser.json());

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
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/ready', (_req: Request, res: Response) => {
  const state = mongoose.connection.readyState;
  const ready = state === 1; // connected
  res.status(ready ? 200 : 503).json({ ready, state });
});

app.get('/metrics', (_req: Request, res: Response) => {
  const avgResponseTime = totalRequests ? totalResponseTimeMs / totalRequests : 0;
  res.json({
    totalRequests,
    errorCount,
    avgResponseTimeMs: avgResponseTime,
  });
});

app.use('/api/inventory', inventoryRouter);

// error handler last
app.use(errorHandler);

export default app;
