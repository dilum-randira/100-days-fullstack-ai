import dotenv from 'dotenv';

dotenv.config();

export interface GatewayConfig {
  port: number;
  jwtSecret: string;
  services: {
    auth: string[];
    inventory: string[];
    analytics: string[];
  };
  timeoutsMs: {
    auth: number;
    inventory: number;
    analytics: number;
  };
  hedging: {
    enabled: boolean;
    maxAttempts: number;
  };
}

const parsePort = (value: string | undefined, fallback: number): number => {
  const num = value ? Number(value) : NaN;
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const parseIntSafe = (value: string | undefined, fallback: number): number => {
  const num = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(num) ? num : fallback;
};

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return fallback;
};

const required = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const parseUrlList = (value: string | undefined, fallback: string): string[] => {
  const raw = (value || fallback)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return raw.length ? raw : [fallback];
};

const port = parsePort(process.env.GATEWAY_PORT, 4000);
const jwtSecret = required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);

export const config: GatewayConfig = {
  port,
  jwtSecret,
  services: {
    auth: parseUrlList(process.env.AUTH_SERVICE_URLS, process.env.AUTH_SERVICE_URL || 'http://localhost:4000'),
    inventory: parseUrlList(
      process.env.INVENTORY_SERVICE_URLS,
      process.env.INVENTORY_SERVICE_URL || 'http://localhost:3000',
    ),
    analytics: parseUrlList(
      process.env.ANALYTICS_SERVICE_URLS,
      process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5000',
    ),
  },
  timeoutsMs: {
    auth: parseIntSafe(process.env.GATEWAY_TIMEOUT_AUTH_MS, 3000),
    inventory: parseIntSafe(process.env.GATEWAY_TIMEOUT_INVENTORY_MS, 4000),
    analytics: parseIntSafe(process.env.GATEWAY_TIMEOUT_ANALYTICS_MS, 3500),
  },
  hedging: {
    enabled: parseBool(process.env.GATEWAY_HEDGING_ENABLED, true),
    maxAttempts: parseIntSafe(process.env.GATEWAY_HEDGING_MAX_ATTEMPTS, 2),
  },
};
