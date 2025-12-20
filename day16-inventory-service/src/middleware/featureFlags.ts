import { Request, Response, NextFunction } from 'express';
import { isEnabled } from '../services/featureFlagService';
import { logger } from '../utils/logger';

export const requireFeature = (key: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const enabled = await isEnabled(key);
      if (!enabled) {
        logger.warn('feature.disabled', { key, path: req.path, method: req.method });
        res.status(503).json({ success: false, error: 'FeatureDisabled', feature: key });
        return;
      }
      next();
    } catch (error: any) {
      logger.error('feature.check.failed', { key, message: error.message });
      res.status(503).json({ success: false, error: 'FeatureCheckFailed', feature: key });
    }
  };
};
