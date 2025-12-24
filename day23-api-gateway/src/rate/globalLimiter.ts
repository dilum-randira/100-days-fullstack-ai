import type { Request } from 'express';
import type { RedisClientType } from 'redis';

export type PlanName = 'free' | 'pro' | 'enterprise';

export type TokenBucketConfig = {
  capacity: number; // max tokens (burst)
  refillPerSec: number; // tokens per second
};

export type GlobalLimitConfig = {
  plan: Record<PlanName, TokenBucketConfig>;
  // how much of the org-wide global bucket each region can consume at peak.
  // Each region has its own bucket with lower cap/refill; overall fairness comes from identical per-region limits.
  region: Record<PlanName, TokenBucketConfig>;
};

const cfg: GlobalLimitConfig = {
  plan: {
    free: { capacity: 30, refillPerSec: 5 },
    pro: { capacity: 120, refillPerSec: 30 },
    enterprise: { capacity: 600, refillPerSec: 120 },
  },
  region: {
    free: { capacity: 15, refillPerSec: 3 },
    pro: { capacity: 60, refillPerSec: 15 },
    enterprise: { capacity: 300, refillPerSec: 60 },
  },
};

type BucketState = {
  tokens: number;
  lastRefillMs: number;
};

type Decision = {
  allowed: boolean;
  retryAfterSeconds?: number;
  // tokens remaining in the region bucket (best effort)
  remaining?: number;
  // capacity of region bucket
  capacity?: number;
};

type TenantKey = {
  organizationId: string;
  region: string;
};

const normalizeRegion = (v: unknown): string => {
  if (typeof v !== 'string') return 'global';
  const t = v.trim().toLowerCase();
  return t || 'global';
};

const normalizeOrg = (v: unknown): string => {
  if (typeof v !== 'string') return 'anonymous';
  const t = v.trim();
  return t || 'anonymous';
};

const normalizePlan = (v: unknown): PlanName => {
  if (v === 'enterprise') return 'enterprise';
  if (v === 'pro') return 'pro';
  return 'free';
};

const nowMs = () => Date.now();

const refill = (state: BucketState, bucket: TokenBucketConfig, now: number): BucketState => {
  const elapsedMs = Math.max(0, now - state.lastRefillMs);
  if (elapsedMs === 0) return state;
  const refillTokens = (elapsedMs / 1000) * bucket.refillPerSec;
  const nextTokens = Math.min(bucket.capacity, state.tokens + refillTokens);
  return { tokens: nextTokens, lastRefillMs: now };
};

const computeRetryAfterSeconds = (tokens: number, bucket: TokenBucketConfig): number => {
  if (bucket.refillPerSec <= 0) return 60;
  const missing = Math.max(0, 1 - tokens);
  return Math.max(1, Math.ceil(missing / bucket.refillPerSec));
};

// In-memory fallback
const mem = new Map<string, BucketState>();

const memGet = (key: string): BucketState => {
  const s = mem.get(key);
  if (s) return s;
  const init: BucketState = { tokens: 0, lastRefillMs: nowMs() };
  mem.set(key, init);
  return init;
};

const memSet = (key: string, state: BucketState): void => {
  mem.set(key, state);
};

// Metrics (best-effort, in-memory)
type Metrics = {
  allowed: number;
  throttled: number;
  burstUsedMax: number;
};
const metrics = new Map<string, Metrics>();

const metricKey = (org: string, region: string) => `${org}:${region}`;

const bump = (org: string, region: string, allowed: boolean, capacity: number, remaining: number) => {
  const k = metricKey(org, region);
  const m = metrics.get(k) || { allowed: 0, throttled: 0, burstUsedMax: 0 };
  if (allowed) m.allowed += 1;
  else m.throttled += 1;
  const used = Math.max(0, capacity - remaining);
  if (used > m.burstUsedMax) m.burstUsedMax = used;
  metrics.set(k, m);
};

export const getGlobalLimitMetrics = () => {
  const tenants: Record<string, Metrics> = {};
  for (const [k, v] of metrics.entries()) tenants[k] = v;
  return { tenants, note: 'metrics are best-effort and kept in-memory at the gateway instance' };
};

export type GlobalLimiterDeps = {
  redis?: RedisClientType;
};

const redisKey = (scope: 'org' | 'region', key: TenantKey) => {
  if (scope === 'org') return `glb:bucket:org:${key.organizationId}`;
  return `glb:bucket:region:${key.organizationId}:${key.region}`;
};

const parseRedisState = (raw: string | null): BucketState | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as BucketState;
    if (typeof v.tokens !== 'number' || typeof v.lastRefillMs !== 'number') return null;
    return v;
  } catch {
    return null;
  }
};

const serializeRedisState = (s: BucketState) => JSON.stringify(s);

const bucketTTLSeconds = 60 * 60; // 1h idle eviction

const tryConsumeRedis = async (
  redis: RedisClientType,
  key: string,
  bucket: TokenBucketConfig,
  cost: number,
): Promise<{ allowed: boolean; state: BucketState }> => {
  const now = nowMs();

  // Lua: refill then consume
  const lua = `
local k = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillPerSec = tonumber(ARGV[2])
local cost = tonumber(ARGV[3])
local now = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])

local raw = redis.call('GET', k)
local tokens = capacity
local lastRefillMs = now

if raw then
  local obj = cjson.decode(raw)
  tokens = tonumber(obj['tokens'])
  lastRefillMs = tonumber(obj['lastRefillMs'])
end

local elapsedMs = now - lastRefillMs
if elapsedMs < 0 then elapsedMs = 0 end
local refillTokens = (elapsedMs / 1000.0) * refillPerSec
local newTokens = tokens + refillTokens
if newTokens > capacity then newTokens = capacity end

local allowed = 0
if newTokens >= cost then
  newTokens = newTokens - cost
  allowed = 1
end

local out = cjson.encode({ tokens = newTokens, lastRefillMs = now })
redis.call('SET', k, out, 'EX', ttl)
return { allowed, newTokens }
`;

  const res = (await redis.eval(lua, {
    keys: [key],
    arguments: [
      String(bucket.capacity),
      String(bucket.refillPerSec),
      String(cost),
      String(now),
      String(bucketTTLSeconds),
    ],
  })) as any;

  const allowed = Array.isArray(res) ? Number(res[0]) === 1 : false;
  const remaining = Array.isArray(res) ? Number(res[1]) : 0;

  return { allowed, state: { tokens: Number.isFinite(remaining) ? remaining : 0, lastRefillMs: now } };
};

const tryConsumeMemory = (key: string, bucket: TokenBucketConfig, cost: number): { allowed: boolean; state: BucketState } => {
  const now = nowMs();
  const current = memGet(key);
  const refilled = refill(current, bucket, now);
  const allowed = refilled.tokens >= cost;
  const next: BucketState = allowed
    ? { tokens: refilled.tokens - cost, lastRefillMs: refilled.lastRefillMs }
    : refilled;
  memSet(key, next);
  return { allowed, state: next };
};

export const resolveTenant = (req: Request): { organizationId: string; region: string; plan: PlanName } => {
  const orgHeader = (req.headers['x-organization-id'] as any) || (req.headers['x-org-id'] as any);
  const organizationId = normalizeOrg(orgHeader);
  const region = normalizeRegion(req.headers['x-region']);
  const plan = normalizePlan(req.headers['x-plan'] || (req as any).user?.plan || (req as any).user?.tier);
  return { organizationId, region, plan };
};

export const globalTokenBucketCheck = async (
  deps: GlobalLimiterDeps,
  key: TenantKey,
  plan: PlanName,
  cost = 1,
): Promise<Decision> => {
  const orgBucket = cfg.plan[plan];
  const regionBucket = cfg.region[plan];

  const orgK = redisKey('org', key);
  const regK = redisKey('region', key);

  // Enforce two-stage bucket:
  // 1) org-wide global bucket (fair across regions)
  // 2) per-region bucket (prevents one region from stealing entire org allocation)
  // This preserves fairness across regions while still being org-scoped.
  try {
    if (deps.redis) {
      const dOrg = await tryConsumeRedis(deps.redis, orgK, orgBucket, cost);
      if (!dOrg.allowed) {
        const retryAfterSeconds = computeRetryAfterSeconds(dOrg.state.tokens, orgBucket);
        bump(key.organizationId, key.region, false, orgBucket.capacity, dOrg.state.tokens);
        return { allowed: false, retryAfterSeconds, remaining: dOrg.state.tokens, capacity: orgBucket.capacity };
      }

      const dReg = await tryConsumeRedis(deps.redis, regK, regionBucket, cost);
      if (!dReg.allowed) {
        // refund org token best-effort
        try {
          const raw = await deps.redis.get(orgK);
          const st = parseRedisState(raw) || { tokens: orgBucket.capacity, lastRefillMs: nowMs() };
          const refunded = { tokens: Math.min(orgBucket.capacity, st.tokens + cost), lastRefillMs: st.lastRefillMs };
          await deps.redis.set(orgK, serializeRedisState(refunded), { EX: bucketTTLSeconds });
        } catch {
          // ignore refund failure
        }

        const retryAfterSeconds = computeRetryAfterSeconds(dReg.state.tokens, regionBucket);
        bump(key.organizationId, key.region, false, regionBucket.capacity, dReg.state.tokens);
        return { allowed: false, retryAfterSeconds, remaining: dReg.state.tokens, capacity: regionBucket.capacity };
      }

      bump(key.organizationId, key.region, true, regionBucket.capacity, dReg.state.tokens);
      return { allowed: true, remaining: dReg.state.tokens, capacity: regionBucket.capacity };
    }
  } catch {
    // fall through to memory
  }

  // Fallback to local memory
  const orgD = tryConsumeMemory(orgK, orgBucket, cost);
  if (!orgD.allowed) {
    const retryAfterSeconds = computeRetryAfterSeconds(orgD.state.tokens, orgBucket);
    bump(key.organizationId, key.region, false, orgBucket.capacity, orgD.state.tokens);
    return { allowed: false, retryAfterSeconds, remaining: orgD.state.tokens, capacity: orgBucket.capacity };
  }

  const regD = tryConsumeMemory(regK, regionBucket, cost);
  if (!regD.allowed) {
    // refund org best-effort
    const st = memGet(orgK);
    memSet(orgK, { ...st, tokens: Math.min(orgBucket.capacity, st.tokens + cost) });

    const retryAfterSeconds = computeRetryAfterSeconds(regD.state.tokens, regionBucket);
    bump(key.organizationId, key.region, false, regionBucket.capacity, regD.state.tokens);
    return { allowed: false, retryAfterSeconds, remaining: regD.state.tokens, capacity: regionBucket.capacity };
  }

  bump(key.organizationId, key.region, true, regionBucket.capacity, regD.state.tokens);
  return { allowed: true, remaining: regD.state.tokens, capacity: regionBucket.capacity };
};
