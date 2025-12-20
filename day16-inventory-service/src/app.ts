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
import { randomUUID } from 'crypto';
import './events/listeners';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';

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

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/ai', aiRouter);

// API versioning
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v2/inventory', inventoryRouter);

// keep backward compatibility for now
app.use('/api/inventory', inventoryRouter);

app.use('/api/features', featureRoutes);

// error handler last
app.use(errorHandler);

export default app;
