import mongoose, { Connection } from 'mongoose';
import { config } from '../config';

export type DbOp = 'read' | 'write';

type DbRouterMetrics = {
  reads: number;
  writes: number;
  readFallbackToPrimary: number;
};

const metrics: DbRouterMetrics = {
  reads: 0,
  writes: 0,
  readFallbackToPrimary: 0,
};

let writeConn: Connection | null = null;
let readConn: Connection | null = null;

const withRetryWrites = (uri: string, enabled: boolean): string => {
  if (!enabled) return uri;
  return uri.includes('retryWrites=') ? uri : `${uri}${uri.includes('?') ? '&' : '?'}retryWrites=true`;
};

const createConn = async (uri: string, readPreference: any): Promise<Connection> => {
  const c = mongoose.createConnection(uri, {
    replicaSet: config.mongo.replicaSet,
    readPreference,
    maxPoolSize: config.mongo.maxPoolSize,
    connectTimeoutMS: config.mongo.connectTimeoutMs,
    serverSelectionTimeoutMS: config.mongo.serverSelectionTimeoutMs,
    socketTimeoutMS: config.mongo.socketTimeoutMs,
  } as any);

  await c.asPromise();

  c.on('error', (err) => {
    console.error('db.router.connection.error', { readPreference, message: err instanceof Error ? err.message : String(err) });
  });

  return c;
};

const ensureWriteConn = async (): Promise<Connection> => {
  if (writeConn && writeConn.readyState === 1) return writeConn;

  const uri = withRetryWrites(config.mongo.uri || config.mongoUri, config.mongo.retryWrites);
  writeConn = await createConn(uri, 'primary');
  return writeConn;
};

const ensureReadConn = async (): Promise<Connection | null> => {
  if (readConn && readConn.readyState === 1) return readConn;

  const uri = withRetryWrites(config.mongo.uri || config.mongoUri, config.mongo.retryWrites);

  try {
    readConn = await createConn(uri, 'secondaryPreferred');
    return readConn;
  } catch (err: any) {
    console.error('db.router.read_connection.failed', { message: err?.message || String(err) });
    readConn = null;
    return null;
  }
};

const assertWriteOnConn = (conn: Connection, op: DbOp): void => {
  if (op !== 'write') return;
  if (readConn && conn === readConn) {
    const err = new Error('Write attempted using read connection');
    (err as any).code = 'DB_ROUTER_WRITE_ON_READ_CONN';
    if ((process.env.NODE_ENV || 'development') === 'production') {
      throw err;
    }
  }
};

export const getWriteConnection = async (): Promise<Connection> => {
  metrics.writes += 1;
  const conn = await ensureWriteConn();
  assertWriteOnConn(conn, 'write');
  return conn;
};

export const getReadConnection = async (): Promise<Connection> => {
  metrics.reads += 1;

  const read = await ensureReadConn();
  if (read && read.readyState === 1) {
    return read;
  }

  metrics.readFallbackToPrimary += 1;
  console.log('db.router.read_fallback_to_primary');

  return ensureWriteConn();
};

export const getDbRouterMetrics = (): DbRouterMetrics => ({ ...metrics });
