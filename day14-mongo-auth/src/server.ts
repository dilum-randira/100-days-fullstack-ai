import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './db';

const PORT = process.env.PORT || 3000;

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
