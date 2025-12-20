import dotenv from 'dotenv';

dotenv.config();

export interface AnalyticsConfig {
  port: number;
  mongoUri: string;
}

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

const port = parsePort(process.env.ANALYTICS_PORT, 5000);
const mongoUri = required('MONGO_URI', process.env.MONGO_URI);

export const config: AnalyticsConfig = {
  port,
  mongoUri,
};
