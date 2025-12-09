import { Router } from 'express';
import { register, login, refresh, logoutHandler } from '../controllers/authController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logoutHandler);

export default router;
