import { Router } from 'express';
import { predictQualityHandler } from '../controllers/aiController';

const router = Router();

router.post('/predict-quality', predictQualityHandler);

export default router;
