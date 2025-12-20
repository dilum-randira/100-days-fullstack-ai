import { Request, Response, NextFunction } from 'express';
import { FeatureFlag } from '../models/FeatureFlag';
import { setFlag } from '../services/featureFlagService';

const isAdmin = (req: Request): boolean => {
  const role = (req as any).user?.role || (req.headers['x-user-role'] as string | undefined);
  return role === 'admin';
};

export const listFeatures = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const flags = await FeatureFlag.find({}).sort({ key: 1 }).exec();

    res.status(200).json({ success: true, data: flags });
  } catch (error) {
    next(error);
  }
};

export const enableFeature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { description } = req.body as { description?: string };
    const flag = await setFlag(req.params.key, true, description);

    res.status(200).json({ success: true, data: flag });
  } catch (error) {
    next(error);
  }
};

export const disableFeature = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isAdmin(req)) {
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    const { description } = req.body as { description?: string };
    const flag = await setFlag(req.params.key, false, description);

    res.status(200).json({ success: true, data: flag });
  } catch (error) {
    next(error);
  }
};
