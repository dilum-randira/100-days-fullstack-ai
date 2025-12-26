import { SystemControl } from '../models/SystemControl';

const CONTROL_KEY = 'system' as const;

export type SystemControlSnapshot = {
  frozen: boolean;
  killed: Set<string>;
  updatedAt?: Date;
};

type Cached = {
  snapshot: SystemControlSnapshot;
  fetchedAtMs: number;
};

let cache: Cached | null = null;

// Keep it short so changes have "instant" effect without redeploy.
const DEFAULT_CACHE_MS = 1000;

const ensureDoc = async () => {
  await SystemControl.updateOne(
    { key: CONTROL_KEY },
    { $setOnInsert: { key: CONTROL_KEY, frozen: false, killedFeatures: [] } },
    { upsert: true },
  ).exec();
};

export const getSystemControl = async (opts?: { maxAgeMs?: number; bypassCache?: boolean }): Promise<SystemControlSnapshot> => {
  const maxAgeMs = opts?.maxAgeMs ?? DEFAULT_CACHE_MS;
  const bypassCache = opts?.bypassCache ?? false;

  const now = Date.now();
  if (!bypassCache && cache && now - cache.fetchedAtMs <= maxAgeMs) {
    return cache.snapshot;
  }

  await ensureDoc();
  const doc = await SystemControl.findOne({ key: CONTROL_KEY }).lean().exec();

  const snap: SystemControlSnapshot = {
    frozen: Boolean(doc?.frozen),
    killed: new Set((doc?.killedFeatures || []).map((s: string) => String(s))),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt) : undefined,
  };

  cache = { snapshot: snap, fetchedAtMs: now };
  return snap;
};

export const setFrozen = async (frozen: boolean): Promise<SystemControlSnapshot> => {
  await ensureDoc();
  const doc = await SystemControl.findOneAndUpdate(
    { key: CONTROL_KEY },
    { $set: { frozen } },
    { new: true, upsert: true },
  )
    .lean()
    .exec();

  const snap: SystemControlSnapshot = {
    frozen: Boolean(doc?.frozen),
    killed: new Set((doc?.killedFeatures || []).map((s: string) => String(s))),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt) : undefined,
  };

  cache = { snapshot: snap, fetchedAtMs: Date.now() };
  return snap;
};

export const killFeature = async (feature: string): Promise<SystemControlSnapshot> => {
  const f = String(feature || '').trim();
  if (!f) return getSystemControl({ bypassCache: true });

  await ensureDoc();
  const doc = await SystemControl.findOneAndUpdate(
    { key: CONTROL_KEY },
    { $addToSet: { killedFeatures: f } },
    { new: true, upsert: true },
  )
    .lean()
    .exec();

  const snap: SystemControlSnapshot = {
    frozen: Boolean(doc?.frozen),
    killed: new Set((doc?.killedFeatures || []).map((s: string) => String(s))),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt) : undefined,
  };

  cache = { snapshot: snap, fetchedAtMs: Date.now() };
  return snap;
};

export const enableFeature = async (feature: string): Promise<SystemControlSnapshot> => {
  const f = String(feature || '').trim();
  if (!f) return getSystemControl({ bypassCache: true });

  await ensureDoc();
  const doc = await SystemControl.findOneAndUpdate(
    { key: CONTROL_KEY },
    { $pull: { killedFeatures: f } },
    { new: true, upsert: true },
  )
    .lean()
    .exec();

  const snap: SystemControlSnapshot = {
    frozen: Boolean(doc?.frozen),
    killed: new Set((doc?.killedFeatures || []).map((s: string) => String(s))),
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt) : undefined,
  };

  cache = { snapshot: snap, fetchedAtMs: Date.now() };
  return snap;
};

export const isFeatureKilled = async (feature: string): Promise<boolean> => {
  const snap = await getSystemControl();
  return snap.killed.has(feature);
};

export const resetSystemControlCache = (): void => {
  cache = null;
};
