import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth';
import protectedRoutes from './routes/protected';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Day 14 - Mongo Auth API',
    endpoints: {
      register: '/api/auth/register',
      login: '/api/auth/login',
      refresh: '/api/auth/refresh',
      logout: '/api/auth/logout',
      secret: '/api/secret',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', protectedRoutes);

app.use(errorHandler);

export default app;
