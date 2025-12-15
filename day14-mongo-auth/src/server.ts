import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { connectDB } from './db';
import { config } from './config';

const PORT = config.port;

const start = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Day 14 Auth API running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
