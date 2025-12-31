import { Request, Response, NextFunction } from 'express';
import { getErrorBudgetState, isBudgetExhausted } from './errorBudget';
import { sloConfig } from './sloConfig';
import { logger } from '../utils/logger';
import { setAdaptiveTierOverride } from '../middleware/adaptiveRateLimit';

// Middleware to enforce SLO-based actions: block non-critical writes and reduce rate limits
export const sreEnforce = (serviceName = 'authService') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const cfg = sloConfig[serviceName];
      if (!cfg) return next();

      const exhausted = isBudgetExhausted(serviceName);
      const budget = getErrorBudgetState(serviceName);

      // If burning (slow/fast) reduce rate limits proactively
      if (budget.signal === 'slow') {
        setAdaptiveTierOverride('tight');
      } else if (budget.signal === 'fast') {
        setAdaptiveTierOverride('severe');
      } else if (budget.signal === 'ok') {
        setAdaptiveTierOverride(null);
      }

      // If exhausted, block non-critical write operations
      if (exhausted && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        const path = req.path || '';
        const isCritical = (cfg.criticalEndpoints || []).some((p) => path.startsWith(p));
        if (!isCritical) {
          logger.warn('sre.enforce.block_write', { service: serviceName, path, method: req.method });
          res.setHeader('Retry-After', '30');
          res.status(503).json({ success: false, error: 'ServiceTemporarilyUnavailable', message: 'Write operations are temporarily limited due to error budget exhaustion' });
          return;
        }
      }

      next();
    } catch (err: any) {
      // If enforcement fails, fail open (do not block traffic)
      logger.error('sre.enforce.error', { message: err?.message || String(err) });
      next();
    }
  };
};
