import type { Migration } from './types';
import mongoose from 'mongoose';

export const version = 1;
export const description = 'Initialize migration framework (no-op)';

export const up: Migration['up'] = async () => {
  // No-op: framework bootstrap.
  // Example place to create indexes/collections explicitly.
  await mongoose.connection.db?.command({ ping: 1 });
};

export const down: Migration['down'] = async () => {
  // No-op
  await mongoose.connection.db?.command({ ping: 1 });
};
