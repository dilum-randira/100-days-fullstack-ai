import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config({ path: path.resolve(__dirname, '..', '.env.test') });
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

let mongoServer: MongoMemoryServer | null = null;

export const setupTestDB = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.disconnect();
  await mongoose.connect(uri);
};

export const teardownTestDB = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
      mongoServer = null;
    }
  }
};
