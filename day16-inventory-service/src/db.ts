import mongoose from 'mongoose';
import { logger } from './utils/logger';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error('MONGO_URI is not defined in environment variables');
    throw new Error('MONGO_URI is not defined');
  }

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      attempt += 1;
      const conn = await mongoose.connect(uri);
      logger.info('MongoDB connected', {
        host: conn.connection.host,
        name: conn.connection.name,
      });
      return;
    } catch (error: any) {
      logger.error('MongoDB connection error', {
        attempt,
        message: error.message,
      });
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
};

export const closeDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  }
};
