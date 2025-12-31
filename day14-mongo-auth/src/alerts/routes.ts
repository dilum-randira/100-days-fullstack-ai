import { Router } from 'express';
import { acknowledgeAlert, getAlerts } from './engine';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ alerts: getAlerts() });
});

router.post('/:id/ack', async (req, res) => {
  const updated = await acknowledgeAlert(req.params.id);
  if (!updated) {
    res.status(404).json({ success: false, error: 'NotFound' });
    return;
  }
  res.json({ success: true, alert: updated });
});

export default router;
