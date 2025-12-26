import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config as appConfig } from './config';

let mongoServer: MongoMemoryServer | null = null;

export const setupTestDB = async (): Promise<void> => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.disconnect();
  await mongoose.connect(uri, { autoIndex: true });
};

export const teardownTestDB = async (): Promise<void> => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
    mongoServer = null;
  }
};
