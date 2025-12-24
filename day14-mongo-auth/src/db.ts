import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './utils/logger';

type FailoverState = {
  lastDisconnectedAt?: Date;
  lastReconnectedAt?: Date;
  lastError?: string;
};

const failoverState: FailoverState = {};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const withRetryWrites = (uri: string, enabled: boolean): string => {
  if (!enabled) return uri;
  return uri.includes('retryWrites=') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}retryWrites=true`;
};

export const getDbDegradedState = (): {
  canRead: boolean;
  canWrite: boolean;
  state: number;
  lastDisconnectedAt?: string;
  lastReconnectedAt?: string;
  lastError?: string;
} => {
  const state = mongoose.connection.readyState;
  const canRead = state === 1; // connected

  const canWrite = state === 1;

  return {
    canRead,
    canWrite,
    state,
    lastDisconnectedAt: failoverState.lastDisconnectedAt?.toISOString(),
    lastReconnectedAt: failoverState.lastReconnectedAt?.toISOString(),
    lastError: failoverState.lastError,
  };
};

let eventsBound = false;
const bindFailoverLogging = (): void => {
  if (eventsBound) return;
  eventsBound = true;

  mongoose.connection.on('connected', () => {
    failoverState.lastReconnectedAt = new Date();
    logger.info('db.connected', {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    });
  });

  mongoose.connection.on('disconnected', () => {
    failoverState.lastDisconnectedAt = new Date();
    logger.warn('db.disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    failoverState.lastReconnectedAt = new Date();
    logger.info('db.reconnected');
  });

  mongoose.connection.on('error', (err) => {
    failoverState.lastError = err instanceof Error ? err.message : String(err);
    logger.error('db.error', { message: failoverState.lastError });
  });

  mongoose.connection.on('close', () => {
    logger.warn('db.closed');
  });

  mongoose.connection.on('fullsetup', () => {
    // Emitted by the driver for replica sets after all members are discovered.
    logger.info('db.replicaSet.fullsetup');
  });
};

const MAX_RETRIES = 8;
const BASE_DELAY_MS = 750;

export const connectDB = async (): Promise<void> => {
  bindFailoverLogging();

  const uri = withRetryWrites(config.mongo.uri || config.mongoUri, config.mongo.retryWrites);

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt += 1;
    try {
      await mongoose.connect(uri, {
        replicaSet: config.mongo.replicaSet,
        readPreference: config.mongo.readPreference,
        maxPoolSize: config.mongo.maxPoolSize,
        connectTimeoutMS: config.mongo.connectTimeoutMs,
        serverSelectionTimeoutMS: config.mongo.serverSelectionTimeoutMs,
        socketTimeoutMS: config.mongo.socketTimeoutMs,
      } as any);

      return;
    } catch (error: any) {
      failoverState.lastError = error?.message || String(error);
      logger.error('db.connect.error', { attempt, message: failoverState.lastError });

      if (attempt >= MAX_RETRIES) {
        throw error;
      }

      const backoff = Math.min(8000, BASE_DELAY_MS * 2 ** (attempt - 1));
      await sleep(backoff);
    }
  }
};

export const closeDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('db.closed.gracefully');
  }
};
