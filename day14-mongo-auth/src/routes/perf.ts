import { Router, Request, Response } from 'express';
import { snapshotPerf } from '../perf/perfMetrics';

const router = Router();

router.get('/perf', (_req: Request, res: Response) => {
  res.json({
    service: 'auth-service',
    generatedAt: new Date().toISOString(),
    metrics: snapshotPerf(),
  });
});

export default router;
