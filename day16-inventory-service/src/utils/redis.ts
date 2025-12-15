import { logger } from './logger';
import Redis from 'ioredis';
import { config } from '../config';

const redisUrl = config.redisUrl;

let client: Redis | null = null;

if (redisUrl) {
  try {
    client = new Redis(redisUrl, { lazyConnect: true });

    client.on('error', (err: Error) => {
      logger.error('Redis error', { message: err.message });
    });

    client.connect().catch((err: Error) => {
      logger.error('Failed to connect to Redis', { message: err.message });
    });
  } catch (err: any) {
    logger.error('Redis initialization failed', { message: err.message });
    client = null;
  }
} else {
  logger.info('REDIS_URL not set, Redis caching disabled');
}

export const redisClient = client;
