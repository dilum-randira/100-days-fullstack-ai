import { Router } from 'express';
import { register, login, refresh, logoutHandler } from '../controllers/authController';
import { idempotency } from '../middleware/idempotency';
import { loginAttemptThrottle } from '../middleware/loginThrottle';

const router = Router();

router.post('/register', idempotency({ required: true }), register);
router.post('/login', idempotency({ required: true }), loginAttemptThrottle(), login);
router.post('/refresh', idempotency({ required: true }), refresh);
router.post('/logout', idempotency({ required: true }), logoutHandler);

export default router;
