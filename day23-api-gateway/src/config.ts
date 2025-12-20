import dotenv from 'dotenv';

dotenv.config();

export interface GatewayConfig {
  port: number;
  jwtSecret: string;
  services: {
    auth: string;
    inventory: string;
    analytics: string;
  };
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

const port = parsePort(process.env.GATEWAY_PORT, 4000);
const jwtSecret = required('JWT_ACCESS_SECRET', process.env.JWT_ACCESS_SECRET);

export const config: GatewayConfig = {
  port,
  jwtSecret,
  services: {
    auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4000',
    inventory: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3000',
    analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5000',
  },
};
