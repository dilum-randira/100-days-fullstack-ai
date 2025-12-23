import mongoose from 'mongoose';
import { config } from './config';

export const connectDB = async (): Promise<void> => {
  const uri = config.mongoUri;

  try {
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error', error);
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed gracefully');
  }
};
