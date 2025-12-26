import type { Request, Response, NextFunction } from 'express';
import { killFeature, setFrozen } from '../services/systemControlService';
import { withRequestContext } from '../utils/logger';

const getActorId = (req: Request): string | undefined => {
  return (req as any).user?.id || (req.headers['x-user-id'] as string | undefined);
};

const logAction = (req: Request & { requestId?: string; correlationId?: string }, event: string, details: Record<string, unknown>) => {
  const log = withRequestContext(req.requestId, req.correlationId);
  log.warn(event, { actorId: getActorId(req), ...details });
};

export const freeze = async (req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) => {
  try {
    const snap = await setFrozen(true);
    logAction(req, 'system.freeze.enabled', { frozen: true, updatedAt: snap.updatedAt?.toISOString() });
    res.status(200).json({ success: true, frozen: true, updatedAt: snap.updatedAt?.toISOString() });
  } catch (e) {
    next(e);
  }
};

export const unfreeze = async (req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) => {
  try {
    const snap = await setFrozen(false);
    logAction(req, 'system.freeze.disabled', { frozen: false, updatedAt: snap.updatedAt?.toISOString() });
    res.status(200).json({ success: true, frozen: false, updatedAt: snap.updatedAt?.toISOString() });
  } catch (e) {
    next(e);
  }
};

export const kill = async (req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) => {
  try {
    const feature = String(req.params.feature || '').trim();
    const snap = await killFeature(feature);
    logAction(req, 'system.kill_switch.killed', { feature, updatedAt: snap.updatedAt?.toISOString() });
    res.status(200).json({ success: true, feature, killed: true, updatedAt: snap.updatedAt?.toISOString() });
  } catch (e) {
    next(e);
  }
};
