import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import filesRouter from './routes/files';
import { errorHandler } from './middleware/errorHandler';
import { getStorageConfig } from './config/storage';

const app: Application = express();

app.use(cors());
app.use(express.json());

const storageConfig = getStorageConfig();
if (storageConfig.provider === 'local') {
  const uploadDir = storageConfig.local.uploadDir;
  app.use('/uploads', express.static(path.resolve(uploadDir)));
}

app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Day 15 - File Upload API',
    storageProvider: storageConfig.provider,
  });
});

app.use('/api/files', filesRouter);

app.use(errorHandler);

export default app;
