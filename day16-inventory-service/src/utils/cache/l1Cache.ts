export type L1CacheStats = {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  size: number;
};

type Entry<T> = {
  value: T;
  expiresAt: number;
};

export class L1TtlCache {
  private store = new Map<string, Entry<unknown>>();
  private stats: Omit<L1CacheStats, 'size'> = {
    hits: 0,
    misses: 0,
    sets: 0,
    evictions: 0,
  };

  constructor(private readonly ttlMs: number) {}

  getStats(): L1CacheStats {
    this.cleanup();
    return { ...this.stats, size: this.store.size };
  }

  get<T>(key: string): T | null {
    const raw = this.store.get(key);
    if (!raw) {
      this.stats.misses += 1;
      return null;
    }

    if (Date.now() >= raw.expiresAt) {
      this.store.delete(key);
      this.stats.evictions += 1;
      this.stats.misses += 1;
      return null;
    }

    this.stats.hits += 1;
    return raw.value as T;
  }

  set<T>(key: string, value: T): void {
    try {
      this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
      this.stats.sets += 1;
    } catch {
      // Do not break API on cache issues
    }
  }

  del(key: string): void {
    this.store.delete(key);
  }

  clear(prefix?: string): void {
    if (!prefix) {
      this.store.clear();
      return;
    }
    for (const k of this.store.keys()) {
      if (k.startsWith(prefix)) this.store.delete(k);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [k, v] of this.store.entries()) {
      if (now >= v.expiresAt) {
        this.store.delete(k);
        this.stats.evictions += 1;
      }
    }
  }
}
