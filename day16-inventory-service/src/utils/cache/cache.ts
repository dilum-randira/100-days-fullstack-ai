import { L1TtlCache } from './l1Cache';
import { redisClient } from '../redis';
import { logger } from '../logger';
import { config } from '../../config';

export type CacheTier = 'l1' | 'l2' | 'none';

export type CacheStats = {
  l1: { hits: number; misses: number; sets: number; evictions: number; size: number };
  l2: { hits: number; misses: number; sets: number; errors: number };
};

const l1 = new L1TtlCache(config.cache.l1TtlSeconds * 1000);

const l2Stats = { hits: 0, misses: 0, sets: 0, errors: 0 };

const safeJsonParse = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const cacheGet = async <T>(key: string): Promise<{ value: T | null; tier: CacheTier }> => {
  try {
    const v1 = l1.get<T>(key);
    if (v1 !== null) {
      logger.debug?.('cache.hit', { tier: 'l1', key });
      return { value: v1, tier: 'l1' };
    }
  } catch {
    // ignore
  }

  if (!redisClient) {
    logger.debug?.('cache.miss', { tier: 'none', key });
    return { value: null, tier: 'none' };
  }

  try {
    const raw = await redisClient.get(key);
    if (!raw) {
      l2Stats.misses += 1;
      logger.debug?.('cache.miss', { tier: 'l2', key });
      return { value: null, tier: 'l2' };
    }

    const parsed = safeJsonParse<T>(raw);
    if (parsed === null) {
      l2Stats.errors += 1;
      await redisClient.del(key).catch(() => undefined);
      return { value: null, tier: 'l2' };
    }

    l2Stats.hits += 1;
    l1.set(key, parsed);
    logger.debug?.('cache.hit', { tier: 'l2', key });
    return { value: parsed, tier: 'l2' };
  } catch (err: any) {
    l2Stats.errors += 1;
    logger.error('cache.l2.error', { key, message: err?.message || String(err) });
    return { value: null, tier: 'none' };
  }
};

export const cacheSet = async <T>(key: string, value: T, ttlSeconds?: number): Promise<void> => {
  try {
    l1.set(key, value);
  } catch {
    // ignore
  }

  if (!redisClient) return;

  try {
    const ttl = ttlSeconds ?? config.cache.l2TtlSeconds;
    await redisClient.set(key, JSON.stringify(value), 'EX', ttl);
    l2Stats.sets += 1;
  } catch (err: any) {
    l2Stats.errors += 1;
    logger.error('cache.l2.set_error', { key, message: err?.message || String(err) });
  }
};

export const cacheInvalidatePrefix = async (prefix: string): Promise<void> => {
  try {
    l1.clear(prefix);
  } catch {
    // ignore
  }

  if (!redisClient) return;

  try {
    const keys = await redisClient.keys(`${prefix}*`);
    if (keys.length) {
      await redisClient.del(keys);
    }
  } catch (err: any) {
    logger.error('cache.invalidate.error', { prefix, message: err?.message || String(err) });
  }
};

export const getCacheStats = (): CacheStats => {
  return {
    l1: l1.getStats(),
    l2: { ...l2Stats },
  };
};
