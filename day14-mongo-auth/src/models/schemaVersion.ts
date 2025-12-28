import type mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const LATEST_SCHEMA_VERSION = 1 as const;

export type SchemaVersioned = {
  schemaVersion?: number;
};

export const getSchemaVersion = (doc: SchemaVersioned | null | undefined): number => {
  const v = (doc as any)?.schemaVersion;
  return Number.isInteger(v) && v > 0 ? v : 0; // 0 = legacy documents with no schemaVersion
};

export const logDeprecatedRead = (
  modelName: string,
  id: unknown,
  foundVersion: number,
  latestVersion = LATEST_SCHEMA_VERSION,
  meta?: Record<string, unknown>,
): void => {
  if (foundVersion >= latestVersion) return;
  logger.warn('schema.deprecated_read', {
    model: modelName,
    id: typeof id === 'string' ? id : undefined,
    foundVersion,
    latestVersion,
    ...meta,
  });
};

export const assertLatestOnWrite = (
  modelName: string,
  doc: SchemaVersioned,
  latestVersion = LATEST_SCHEMA_VERSION,
): void => {
  const v = getSchemaVersion(doc);

  // Always write latest version. If caller tries to set something else, reject.
  if (v !== 0 && v !== latestVersion) {
    throw Object.assign(new Error(`${modelName} write refused: deprecated schemaVersion=${v}`), { statusCode: 400 });
  }

  (doc as any).schemaVersion = latestVersion;
};

export const addSchemaVersionToSchema = (schema: mongoose.Schema): void => {
  schema.add({
    schemaVersion: {
      type: Number,
      required: true,
      default: LATEST_SCHEMA_VERSION,
      min: 1,
    },
  });
};
