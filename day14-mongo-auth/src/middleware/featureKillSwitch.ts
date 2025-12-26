import type { NextFunction, Request, Response } from 'express';
import { getSystemControl } from '../services/systemControlService';
import { withRequestContext } from '../utils/logger';

const getActorId = (req: Request): string | undefined => {
  return (req as any).user?.id || (req.headers['x-user-id'] as string | undefined);
};

// Usage: app.use(killSwitch({
//   'auth.register': (req) => req.path.endsWith('/register')
// }))
export const killSwitch = (rules: Record<string, (req: Request) => boolean>) => {
  return async (req: Request & { requestId?: string; correlationId?: string }, res: Response, next: NextFunction) => {
    const snap = await getSystemControl();
    if (!snap.killed.size) {
      next();
      return;
    }

    for (const [feature, match] of Object.entries(rules)) {
      if (!snap.killed.has(feature)) continue;
      if (!match(req)) continue;

      const log = withRequestContext(req.requestId, req.correlationId);
      log.warn('system.kill_switch.blocked', {
        feature,
        actorId: getActorId(req),
        method: req.method,
        path: req.path,
      });

      res.status(503).json({
        success: false,
        error: `Feature disabled: ${feature}`,
        requestId: req.requestId,
      });
      return;
    }

    next();
  };
};
