import dotenv from 'dotenv';

dotenv.config();

import app from './app';
import { connectDB, closeDB } from './db';
import { inventoryWorker, inventoryQueueScheduler } from './queues/inventoryQueue';
import { logger } from './utils/logger';
import { redisClient } from './utils/redis';
import http from 'http';
import { config } from './config';

const PORT = config.port;
const NODE_ENV = config.nodeEnv;

const start = async (): Promise<void> => {
  try {
    await connectDB();
  } catch (err: any) {
    logger.error('server.start.db_error', { message: err.message });
    process.exit(1);
  }

  try {
    await inventoryQueueScheduler.waitUntilReady();
    logger.info('inventory.queue.scheduler.ready');
  } catch (err: any) {
    logger.error('inventory.queue.scheduler.error', { message: err.message });
  }

  inventoryWorker.on('ready', () => {
    logger.info('inventory.worker.ready');
  });

  inventoryWorker.on('error', (err: Error) => {
    logger.error('inventory.worker.error', { message: err.message });
  });

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    logger.info('server.started', { env: NODE_ENV, port: PORT });
    console.log(`🚀 Day 16 Inventory Service running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info('server.shutdown.initiated', { signal });

    server.close((err) => {
      if (err) {
        logger.error('server.shutdown.http_error', { message: err.message });
      }
    });

    try {
      await closeDB();
    } catch (err: any) {
      logger.error('server.shutdown.db_error', { message: err.message });
    }

    try {
      await inventoryWorker.close();
      await inventoryQueueScheduler.close();
      logger.info('server.shutdown.queue_closed');
    } catch (err: any) {
      logger.error('server.shutdown.queue_error', { message: err.message });
    }

    try {
      if (redisClient) {
        await redisClient.quit();
        logger.info('server.shutdown.redis_closed');
      }
    } catch (err: any) {
      logger.error('server.shutdown.redis_error', { message: err.message });
    }

    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  logger.error('server.start.failed', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
