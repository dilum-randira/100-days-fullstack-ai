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

let totalRequests = 0;
let errorCount = 0;
let totalResponseTimeMs = 0;

const app: Application = express();

app.use((req: Request & { requestId?: string }, _res: Response, next: NextFunction) => {
  req.requestId = randomUUID();
  next();
});

app.disable('x-powered-by');
app.use(helmet());

const corsOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : '*',
    credentials: true,
  }),
);

app.use(bodyParser.json());

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

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/ready', (_req: Request, res: Response) => {
  const state = mongoose.connection.readyState;
  const ready = state === 1;
  res.status(ready ? 200 : 503).json({ ready, state });
});

app.get('/metrics', (_req: Request, res: Response) => {
  const avgResponseTime = totalRequests ? totalResponseTimeMs / totalRequests : 0;
  res.json({ totalRequests, errorCount, avgResponseTimeMs: avgResponseTime });
});

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v2/auth', authRoutes);

// backward compatibility
app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

app.use(errorHandler);

export default app;
