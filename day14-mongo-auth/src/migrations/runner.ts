import mongoose from 'mongoose';
import type { Collection } from 'mongodb';
import type { WithId } from 'mongodb';

import { config } from '../config';
import { logger } from '../utils/logger';
import { migrations } from './index';
import type { Migration } from './types';

type AppliedMigration = {
  version: number;
  description: string;
  appliedAt: Date;
  durationMs: number;
};

type MigrationLock = {
  _id: 'migration_lock';
  lockedAt: Date;
  owner: string;
  expiresAt: Date;
};

const COLL_MIGRATIONS = 'migrations';
const COLL_LOCKS = 'locks';

const getOwner = (): string => {
  const host = process.env.HOSTNAME || process.env.COMPUTERNAME || 'unknown-host';
  return `${host}:${process.pid}`;
};

const now = () => new Date();

const getCollection = <T extends Record<string, unknown>>(name: string): Collection<T> => {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not ready');
  return db.collection<T>(name);
};

const ensureIndexes = async (): Promise<void> => {
  await getCollection<AppliedMigration>(COLL_MIGRATIONS).createIndex({ version: 1 }, { unique: true });
  await getCollection<AppliedMigration>(COLL_MIGRATIONS).createIndex({ appliedAt: 1 });

  await getCollection<MigrationLock>(COLL_LOCKS).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
};

const lockTtlMs = (): number => {
  const v = Number.parseInt(process.env.MIGRATION_LOCK_TTL_MS || '300000', 10); // default 5 minutes
  return Number.isFinite(v) && v >= 30_000 ? v : 300_000;
};

const acquireLock = async (): Promise<MigrationLock> => {
  const owner = getOwner();
  const locks = getCollection<MigrationLock>(COLL_LOCKS);
  const ttlMs = lockTtlMs();

  const lockedAt = now();
  const expiresAt = new Date(lockedAt.getTime() + ttlMs);

  try {
    const doc = await locks.findOneAndUpdate(
      { _id: 'migration_lock', $or: [{ expiresAt: { $lte: lockedAt } }, { owner }] },
      { $set: { _id: 'migration_lock', lockedAt, owner, expiresAt } },
      { upsert: true, returnDocument: 'after' as any },
    );

    const value = (doc as any)?.value as WithId<MigrationLock> | null | undefined;
    if (!value) throw new Error('Failed to acquire migration lock');
    if (value.owner !== owner) {
      throw new Error(`Migration lock is held by another owner: ${value.owner}`);
    }

    return value;
  } catch (err: any) {
    const message = err?.message || String(err);
    throw new Error(`Could not acquire migration lock: ${message}`);
  }
};

const releaseLock = async (): Promise<void> => {
  const locks = getCollection<MigrationLock>(COLL_LOCKS);
  const owner = getOwner();
  await locks.deleteOne({ _id: 'migration_lock', owner } as any);
};

const listAppliedVersions = async (): Promise<Set<number>> => {
  const docs = await getCollection<AppliedMigration>(COLL_MIGRATIONS)
    .find({}, { projection: { version: 1 } as any })
    .toArray();
  return new Set(docs.map((d: WithId<AppliedMigration>) => d.version));
};

const validateMigrations = (items: Migration[]): void => {
  const seen = new Set<number>();
  for (const m of items) {
    if (!Number.isInteger(m.version) || m.version <= 0) {
      throw new Error(`Invalid migration version: ${m.version}`);
    }
    if (seen.has(m.version)) {
      throw new Error(`Duplicate migration version: ${m.version}`);
    }
    seen.add(m.version);
  }

  const versions = [...seen].sort((a, b) => a - b);
  for (let i = 1; i < versions.length; i += 1) {
    if (versions[i] < versions[i - 1]) throw new Error('Migrations must be sorted in ascending version order');
  }
};

const recordApplied = async (m: Migration, durationMs: number): Promise<void> => {
  await getCollection<AppliedMigration>(COLL_MIGRATIONS).updateOne(
    { version: m.version },
    {
      $setOnInsert: {
        version: m.version,
        description: m.description,
        appliedAt: now(),
        durationMs,
      },
    },
    { upsert: true },
  );
};

const removeApplied = async (version: number): Promise<void> => {
  await getCollection<AppliedMigration>(COLL_MIGRATIONS).deleteOne({ version });
};

const pickPending = async (items: Migration[]): Promise<Migration[]> => {
  const applied = await listAppliedVersions();
  return items.filter((m) => !applied.has(m.version));
};

const getLastApplied = async (): Promise<AppliedMigration | null> => {
  return getCollection<AppliedMigration>(COLL_MIGRATIONS)
    .find({})
    .sort({ version: -1 })
    .limit(1)
    .next();
};

const resolveMongoUri = (): string => {
  return config.mongo?.uri || config.mongoUri;
};

export const runMigrations = async (): Promise<{ applied: number[] }> => {
  validateMigrations(migrations);

  const startedAt = Date.now();
  logger.info('migrations.run.start', { total: migrations.length });

  await mongoose.connect(resolveMongoUri(), {
    replicaSet: config.mongo.replicaSet,
    readPreference: config.mongo.readPreference,
    maxPoolSize: config.mongo.maxPoolSize,
    connectTimeoutMS: config.mongo.connectTimeoutMs,
    serverSelectionTimeoutMS: config.mongo.serverSelectionTimeoutMs,
    socketTimeoutMS: config.mongo.socketTimeoutMs,
  } as any);

  try {
    await ensureIndexes();
    await acquireLock();

    const pending = await pickPending(migrations);
    const appliedVersions: number[] = [];

    for (const m of pending) {
      const t0 = Date.now();
      logger.info('migrations.migration.start', { version: m.version, description: m.description });
      try {
        await m.up();
        const durationMs = Date.now() - t0;
        await recordApplied(m, durationMs);
        appliedVersions.push(m.version);
        logger.info('migrations.migration.end', {
          version: m.version,
          durationMs,
        });
      } catch (err: any) {
        const message = err?.message || String(err);
        logger.error('migrations.migration.failed', { version: m.version, message });
        throw err;
      }
    }

    logger.info('migrations.run.end', {
      applied: appliedVersions.length,
      appliedVersions,
      durationMs: Date.now() - startedAt,
    });

    return { applied: appliedVersions };
  } finally {
    try {
      await releaseLock();
    } catch (err: any) {
      logger.warn('migrations.lock.release_failed', { message: err?.message || String(err) });
    }

    await mongoose.connection.close().catch(() => undefined);
  }
};

export const rollbackLastMigration = async (): Promise<{ rolledBack?: number }> => {
  validateMigrations(migrations);

  const startedAt = Date.now();
  logger.info('migrations.rollback.start');

  await mongoose.connect(resolveMongoUri(), {
    replicaSet: config.mongo.replicaSet,
    readPreference: config.mongo.readPreference,
    maxPoolSize: config.mongo.maxPoolSize,
    connectTimeoutMS: config.mongo.connectTimeoutMs,
    serverSelectionTimeoutMS: config.mongo.serverSelectionTimeoutMs,
    socketTimeoutMS: config.mongo.socketTimeoutMs,
  } as any);

  try {
    await ensureIndexes();
    await acquireLock();

    const last = await getLastApplied();
    if (!last) {
      logger.info('migrations.rollback.none');
      return { rolledBack: undefined };
    }

    const m = migrations.find((x) => x.version === last.version);
    if (!m) {
      throw new Error(`Cannot rollback unknown migration version ${last.version}`);
    }

    const t0 = Date.now();
    logger.info('migrations.rollback.migration.start', { version: m.version, description: m.description });

    try {
      await m.down();
      await removeApplied(m.version);
      const durationMs = Date.now() - t0;
      logger.info('migrations.rollback.migration.end', { version: m.version, durationMs });
    } catch (err: any) {
      const message = err?.message || String(err);
      logger.error('migrations.rollback.migration.failed', { version: m.version, message });
      throw err;
    }

    logger.info('migrations.rollback.end', { version: m.version, durationMs: Date.now() - startedAt });
    return { rolledBack: m.version };
  } finally {
    try {
      await releaseLock();
    } catch (err: any) {
      logger.warn('migrations.lock.release_failed', { message: err?.message || String(err) });
    }

    await mongoose.connection.close().catch(() => undefined);
  }
};
