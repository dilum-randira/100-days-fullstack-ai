import { Router } from 'express';
import { predictQualityHandler } from '../controllers/aiController';
import { requireFeature } from '../middleware/featureFlags';

const router = Router();

router.post('/predict-quality', requireFeature('ai.inference'), predictQualityHandler);

export default router;
