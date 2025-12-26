import type { NextFunction, Request, Response } from 'express';
import { getSystemControl } from '../services/systemControlService';
import { withRequestContext } from '../utils/logger';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const getActorId = (req: Request): string | undefined => {
  return (req as any).user?.id || (req.headers['x-user-id'] as string | undefined);
};

export const freezeGuard = (opts?: { allowListPaths?: string[] }) => {
  const allow = new Set(opts?.allowListPaths || []);

  return async (req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) => {
    // Only block writes
    if (!WRITE_METHODS.has(req.method)) {
      next();
      return;
    }

    // Allow system control endpoints even during freeze
    if (allow.has(req.path) || Array.from(allow).some((p) => req.path.startsWith(p))) {
      next();
      return;
    }

    const snap = await getSystemControl();
    if (!snap.frozen) {
      next();
      return;
    }

    const log = withRequestContext(req.requestId, req.correlationId);
    log.warn('system.freeze.block_write', {
      actorId: getActorId(req),
      method: req.method,
      path: req.path,
    });

    res.status(503).json({
      success: false,
      error: 'Service is temporarily read-only (freeze enabled)',
      requestId: req.requestId,
    });
  };
};
