import { logger } from './logger';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL;

let client: Redis | null = null;

if (redisUrl) {
  try {
    client = new Redis(redisUrl, { lazyConnect: true });

    client.on('error', (err) => {
      logger.error('Redis error', { message: err.message });
    });

    client.connect().catch((err) => {
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
