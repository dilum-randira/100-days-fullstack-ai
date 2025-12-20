import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config';
import { analyticsProxy, authProxy, inventoryProxy } from './proxies';
import { errorHandler, gatewayRateLimiter, jwtAuthMiddleware, requestIdMiddleware } from './middleware';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

app.use(requestIdMiddleware);
app.use(gatewayRateLimiter);
app.use(jwtAuthMiddleware);

app.use('/api/auth', authProxy);
app.use('/api/inventory', inventoryProxy);
app.use('/api/analytics', analyticsProxy);

app.use(errorHandler);

const start = (): void => {
  app.listen(config.port, () => {
    console.log(`API Gateway listening on port ${config.port}`);
  });
};

start();
