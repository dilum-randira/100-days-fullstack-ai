import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { connectDB } from './db';
import { inventoryWorker, inventoryQueueScheduler } from './queues/inventoryQueue';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 3000;

const start = async (): Promise<void> => {
  await connectDB();

  try {
    await inventoryQueueScheduler.waitUntilReady();
    logger.info('inventory.queue.scheduler.ready');
  } catch (err: any) {
    logger.error('inventory.queue.scheduler.error', { message: err.message });
  }

  inventoryWorker.on('ready', () => {
    logger.info('inventory.worker.ready');
  });

  inventoryWorker.on('error', (err) => {
    logger.error('inventory.worker.error', { message: err.message });
  });

  app.listen(PORT, () => {
    console.log(`🚀 Day 16 Inventory Service running on http://localhost:${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
