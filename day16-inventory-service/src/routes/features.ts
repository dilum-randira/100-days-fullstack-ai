import { Router } from 'express';
import { listFeatures, enableFeature, disableFeature } from '../controllers/featureFlagController';

const router = Router();

router.get('/', listFeatures);
router.post('/:key/enable', enableFeature);
router.post('/:key/disable', disableFeature);

export default router;
