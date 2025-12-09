import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate';

const router = Router();

router.get('/secret', authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'You have accessed a protected route!',
    user: req.user,
  });
});

export default router;
