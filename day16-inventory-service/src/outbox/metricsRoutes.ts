import { Router } from 'express';
import { OutboxEvent } from '../models/OutboxEvent';
import { outboxMetrics } from './outboxMetrics';

const router = Router();

router.get('/metrics/outbox', async (_req, res, next) => {
  try {
    const pending = await OutboxEvent.countDocuments({ status: 'PENDING' }).exec();
    const failed = await OutboxEvent.countDocuments({ status: 'FAILED' }).exec();
    const sent = await OutboxEvent.countDocuments({ status: 'SENT' }).exec();

    res.json({
      service: 'inventory-service',
      outbox: {
        pending,
        failed,
        sent,
        ...outboxMetrics.snapshot(),
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
