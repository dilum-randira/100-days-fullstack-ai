import { Router } from 'express';
import { setLatencyChaos, setErrorChaos, setCpuChaos, stopChaos } from '../controllers/chaosController';

const router = Router();

router.post('/latency', setLatencyChaos);
router.post('/error', setErrorChaos);
router.post('/cpu', setCpuChaos);
router.post('/stop', stopChaos);

export default router;
