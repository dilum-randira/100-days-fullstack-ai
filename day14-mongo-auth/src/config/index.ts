import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production';

type MongoReadPreference =
  | 'primary'
  | 'primaryPreferred'
  | 'secondary'
  | 'secondaryPreferred'
  | 'nearest';

const parsePort = (value: string | undefined, fallback: number): number => {
  const num = value ? Number(value) : NaN;
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
};

const parseIntSafe = (value: string | undefined, fallback: number): number => {
  const num = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(num) ? num : fallback;
};

const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const rawNodeEnv: NodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const port = parsePort(process.env.PORT, 4000);
const mongoUri = required('MONGO_URI', process.env.MONGO_URI);
const mongoReplicaSet = process.env.MONGO_REPLICA_SET || undefined;
const mongoRetryWrites = parseBool(process.env.MONGO_RETRY_WRITES, true);
const mongoConnectTimeoutMs = parseIntSafe(process.env.MONGO_CONNECT_TIMEOUT_MS, 10000);
const mongoServerSelectionTimeoutMs = parseIntSafe(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 10000);
const mongoSocketTimeoutMs = parseIntSafe(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000);
const mongoMaxPoolSize = parseIntSafe(process.env.MONGO_MAX_POOL_SIZE, 20);

// Auth is write-heavy; keep default readPreference primaryPreferred.
const mongoReadPreference: MongoReadPreference =
  (process.env.MONGO_READ_PREFERENCE as MongoReadPreference) || 'primaryPreferred';

const jwtAccessSecret = required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
const jwtRefreshSecret = required('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
const redisUrl = required('REDIS_URL', process.env.REDIS_URL);

// Sharding (future-proofing for org-based sharding)
const shardKeyRequiredInProd = parseBool(process.env.SHARD_KEY_REQUIRED_IN_PROD, true);
const shardKeyHeaderName = process.env.SHARD_KEY_HEADER_NAME || 'x-organization-id';

// Caching
const cacheL1TtlSeconds = parseIntSafe(process.env.CACHE_L1_TTL_SECONDS, 5);
const cacheL2TtlSeconds = parseIntSafe(process.env.CACHE_L2_TTL_SECONDS, 60);

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  mongoUri: string;
  mongo: {
    uri: string;
    replicaSet?: string;
    retryWrites: boolean;
    readPreference: MongoReadPreference;
    connectTimeoutMs: number;
    serverSelectionTimeoutMs: number;
    socketTimeoutMs: number;
    maxPoolSize: number;
  };
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  redisUrl: string;
  sharding: {
    shardKeyHeaderName: string;
    requiredInProd: boolean;
  };
  cache: {
    l1TtlSeconds: number;
    l2TtlSeconds: number;
  };
}

export const config: AppConfig = {
  port,
  nodeEnv: rawNodeEnv,
  mongoUri,
  mongo: {
    uri: mongoUri,
    replicaSet: mongoReplicaSet,
    retryWrites: mongoRetryWrites,
    readPreference: mongoReadPreference,
    connectTimeoutMs: mongoConnectTimeoutMs,
    serverSelectionTimeoutMs: mongoServerSelectionTimeoutMs,
    socketTimeoutMs: mongoSocketTimeoutMs,
    maxPoolSize: mongoMaxPoolSize,
  },
  jwt: {
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
  },
  redisUrl,
  sharding: {
    shardKeyHeaderName,
    requiredInProd: shardKeyRequiredInProd,
  },
  cache: {
    l1TtlSeconds: cacheL1TtlSeconds,
    l2TtlSeconds: cacheL2TtlSeconds,
  },
};