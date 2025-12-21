if (isCircuitOpen()) {
  logger.warn('analytics.client.circuit_open');
  return null; // fallback to cache or safe default
}

try {
  const response = await withRetry(...);
  recordSuccess();
  return response.data;
} catch (err) {
  recordFailure();
  // log + return null
}if (isCircuitOpen()) {
  logger.warn('analytics.client.circuit_open');
  return null; // fallback to cache or safe default
}

try {
  const response = await withRetry(...);
  recordSuccess();
  return response.data;
} catch (err) {
  recordFailure();
  // log + return null
}type RouteKey = string;

interface RouteMetrics {
  count: number;
  errors: number;
  totalDurationMs: number;
}

const routes: Record<RouteKey, RouteMetrics> = {};

export const recordRequest = (key: string, durationMs: number, error: boolean) => {
  const m = (routes[key] ??= { count: 0, errors: 0, totalDurationMs: 0 });
  m.count += 1;
  if (error) m.errors += 1;
  m.totalDurationMs += durationMs;
};

export const getMetricsSnapshot = () => {
  const snapshot: Record<string, { count: number; errors: number; avgMs: number }> = {};
  for (const [key, m] of Object.entries(routes)) {
    snapshot[key] = {
      count: m.count,
      errors: m.errors,
      avgMs: m.count ? Number((m.totalDurationMs / m.count).toFixed(2)) : 0,
    };
  }
  return snapshot;
};import dotenv from 'dotenv';

dotenv.config();

type NodeEnv = 'development' | 'production';

const parsePort = (value: string | undefined, fallback: number): number => {
  const num = value ? Number(value) : NaN;
  return Number.isFinite(num) && num > 0 ? num : fallback;
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
const jwtAccessSecret = required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);
const jwtRefreshSecret = required('JWT_REFRESH_SECRET', process.env.JWT_REFRESH_SECRET);
const redisUrl = required('REDIS_URL', process.env.REDIS_URL);

export interface AppConfig {
  port: number;
  nodeEnv: NodeEnv;
  mongoUri: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
  };
  redisUrl: string;
}

export const config: AppConfig = {
  port,
  nodeEnv: rawNodeEnv,
  mongoUri,
  jwt: {
    accessSecret: jwtAccessSecret,
    refreshSecret: jwtRefreshSecret,
  },
  redisUrl,
};
