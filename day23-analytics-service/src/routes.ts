import { Router, Request, Response, NextFunction } from 'express';
import { getInventorySummary, getTopItems, getTrendingItems } from './services/analyticsService';

const router = Router();

router.get('/inventory/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await getInventorySummary();
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

router.get('/inventory/trending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const items = await getTrendingItems(limit);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

router.get('/inventory/top', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const items = await getTopItems(limit);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
});

export default router;
