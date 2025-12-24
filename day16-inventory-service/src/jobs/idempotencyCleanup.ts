import { IdempotencyKey } from '../models/IdempotencyKey';
import { logger } from '../utils/logger';

let started = false;

export const startIdempotencyCleanupJob = (): void => {
  if (started) return;
  started = true;

  const intervalMs = Number(process.env.IDEMPOTENCY_CLEANUP_INTERVAL_MS || 60 * 60 * 1000);

  const run = async () => {
    try {
      const now = new Date();
      const result = await IdempotencyKey.deleteMany({ expiresAt: { $lte: now } }).exec();
      logger.info('idempotency.cleanup', { deletedCount: result.deletedCount ?? 0 });
    } catch (err: any) {
      logger.error('idempotency.cleanup_error', { message: err.message });
    }
  };

  // Run once shortly after boot to keep collection tidy even if TTL monitor lags.
  const warmupMs = Number(process.env.IDEMPOTENCY_CLEANUP_WARMUP_MS || 30_000);
  const warm = setTimeout(() => void run(), warmupMs);
  (warm as any).unref?.();

  const t = setInterval(() => void run(), intervalMs);
  (t as any).unref?.();
};
