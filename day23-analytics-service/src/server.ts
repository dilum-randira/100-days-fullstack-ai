import express from 'express';
import { config } from './config';
import { connectDB } from './db';
import routes from './routes';

const app = express();

app.use(express.json());
app.use('/api/analytics', routes);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: 'InternalServerError' });
});

const start = async (): Promise<void> => {
  await connectDB();
  app.listen(config.port, () => {
    console.log(`Analytics service listening on port ${config.port}`);
  });
};

start().catch((err) => {
  console.error('Failed to start analytics service', err);
  process.exit(1);
});
