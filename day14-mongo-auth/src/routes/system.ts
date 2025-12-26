import { Router } from 'express';
import { freeze, unfreeze, kill, enable } from '../controllers/systemController';
import { authenticate } from '../middleware/authenticate';
import { adminOnly } from '../middleware/adminOnly';

const router = Router();

// Admin-only controls
router.post('/freeze', authenticate, adminOnly(), freeze);
router.post('/unfreeze', authenticate, adminOnly(), unfreeze);
router.post('/kill/:feature', authenticate, adminOnly(), kill);
router.post('/enable/:feature', authenticate, adminOnly(), enable);

export default router;
