import dotenv from 'dotenv';

dotenv.config();

import http from 'http';
import type { Socket } from 'net';
import app, { markShuttingDown } from './app';
import { connectDB, closeDB } from './db';
import { config } from './config';
import { startIdempotencyCleanupJob } from './jobs/idempotencyCleanup';

const PORT = config.port;

type ShutdownState = {
  isShuttingDown: boolean;
  connections: Set<Socket>;
};

const shutdownState: ShutdownState = {
  isShuttingDown: false,
  connections: new Set(),
};

const start = async (): Promise<void> => {
  await connectDB();

  // Background housekeeping for idempotency keys
  startIdempotencyCleanupJob();

  const server = http.createServer(app);

  server.on('connection', (socket: Socket) => {
    shutdownState.connections.add(socket);
    socket.on('close', () => shutdownState.connections.delete(socket));
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Day 14 Auth API running on http://0.0.0.0:${PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    if (shutdownState.isShuttingDown) return;
    shutdownState.isShuttingDown = true;

    console.log('server.shutdown.initiated', { signal });
    markShuttingDown();

    server.close((err?: Error) => {
      if (err) {
        console.error('server.shutdown.http_error', { message: err.message });
      } else {
        console.log('server.shutdown.http_closed');
      }
    });

    const drainTimeoutMs = Number(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS || 25000);
    const hardKillTimeout = setTimeout(() => {
      console.log('server.shutdown.force_close_connections', { openConnections: shutdownState.connections.size });
      for (const socket of shutdownState.connections) {
        socket.destroy();
      }
    }, drainTimeoutMs);
    (hardKillTimeout as any).unref?.();

    try {
      await closeDB();
      console.log('server.shutdown.db_closed');
    } catch (err: any) {
      console.error('server.shutdown.db_error', { message: err?.message || String(err) });
    }

    const done = setTimeout(() => {
      console.log('server.shutdown.completed');
      process.exit(0);
    }, 250);
    (done as any).unref?.();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
