import dotenv from 'dotenv';

dotenv.config();

import http from 'http';
import type { Socket } from 'net';
import app, { markShuttingDown } from './app';
import { connectDB, closeDB } from './db';
import { inventoryWorker, inventoryQueueScheduler } from './queues/inventoryQueue';
import { logger } from './utils/logger';
import { redisClient } from './utils/redis';
import { config } from './config';
import { initSocket } from './sockets';
import { startIdempotencyCleanupJob } from './jobs/idempotencyCleanup';
import { startOutboxDispatcher } from './outbox/dispatcher';

const PORT = config.port;
const NODE_ENV = config.nodeEnv;

const start = async (): Promise<void> => {
  try {
    await connectDB();
  } catch (err: any) {
    logger.error('server.start.db_error', { message: err.message });
    process.exit(1);
  }

  // Background housekeeping for idempotency keys
  startIdempotencyCleanupJob();

  // Transactional outbox dispatcher
  startOutboxDispatcher();

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

  // Track open connections to avoid request loss during shutdown.
  const connections = new Set<Socket>();
  server.on('connection', (socket: Socket) => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  try {
    initSocket(server);
    logger.info('socket.io.initialized');
  } catch (err: any) {
    logger.error('socket.io.init_error', { message: err.message });
  }

  server.listen(PORT, '0.0.0.0', () => {
    logger.info('server.started', { env: NODE_ENV, port: PORT });
    console.log(`Day 16 Inventory Service running on http://0.0.0.0:${PORT}`);
  });

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info('server.shutdown.initiated', { signal });

    // Immediately fail readiness so Kubernetes stops routing traffic to this pod.
    markShuttingDown();

    // Stop accepting new connections.
    server.close((err?: Error) => {
      if (err) {
        logger.error('server.shutdown.http_error', { message: err.message });
      } else {
        logger.info('server.shutdown.http_closed');
      }
    });

    // Allow in-flight requests to complete. After timeout, force-close remaining sockets.
    const drainTimeoutMs = Number(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS || 25000);
    const t = setTimeout(() => {
      logger.warn('server.shutdown.force_close_connections', { openConnections: connections.size });
      for (const socket of connections) {
        socket.destroy();
      }
    }, drainTimeoutMs);
    (t as any).unref?.();

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

    // Allow logs to flush.
    const done = setTimeout(() => process.exit(0), 250);
    (done as any).unref?.();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  logger.error('server.start.failed', { message: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
