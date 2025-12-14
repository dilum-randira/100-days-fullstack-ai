import { Queue, Worker, QueueScheduler, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { redisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryLog } from '../models/InventoryLog';

const connection = redisClient ?? new IORedis(process.env.REDIS_URL ?? '');

export type InventoryJobType =
  | 'recalculate-analytics'
  | 'send-low-stock-alerts'
  | 'archive-old-logs';

export interface InventoryJobPayload {
  itemId?: string;
  trigger?: 'quantity-adjusted' | 'batch-consumed' | 'qc-passed';
}

export const inventoryQueue = new Queue<InventoryJobPayload>('inventory-jobs', {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  } as JobsOptions,
});

export const inventoryQueueScheduler = new QueueScheduler('inventory-jobs', { connection });

export const enqueueInventoryJobs = async (
  jobs: Array<{ name: InventoryJobType; data: InventoryJobPayload }>,
): Promise<void> => {
  try {
    await inventoryQueue.addBulk(
      jobs.map((job) => ({
        name: job.name,
        data: job.data,
      })),
    );
    logger.info('inventory.jobs.enqueued', { count: jobs.length });
  } catch (err: any) {
    logger.error('inventory.jobs.enqueue.error', { message: err.message });
  }
};

const processRecalculateAnalytics = async (): Promise<void> => {
  const totalItems = await InventoryItem.countDocuments().exec();
  const agg = await InventoryItem.aggregate([
    { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
  ]).exec();
  const totalQuantity = agg.length > 0 && typeof agg[0].totalQuantity === 'number' ? agg[0].totalQuantity : 0;

  logger.info('inventory.analytics.recalculated', {
    totalItems,
    totalQuantity,
  });
};

const processSendLowStockAlerts = async (): Promise<void> => {
  const lowStockItems = await InventoryItem.find({ $expr: { $lt: ['$quantity', '$minThreshold'] } }).exec();
  if (lowStockItems.length === 0) {
    logger.info('inventory.lowStockAlerts.none');
    return;
  }

  lowStockItems.forEach((item) => {
    const message = `Low stock alert for ${item.productName} at ${item.location}: quantity=${item.quantity}, minThreshold=${item.minThreshold}`;
    logger.warn('inventory.lowStockAlert', {
      itemId: item._id,
      productName: item.productName,
      location: item.location,
      quantity: item.quantity,
      minThreshold: item.minThreshold,
    });
    console.log(message);
  });
};

const processArchiveOldLogs = async (): Promise<void> => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const result = await InventoryLog.deleteMany({ createdAt: { $lt: cutoff } }).exec();

  logger.info('inventory.logs.archived', {
    deletedCount: result.deletedCount ?? 0,
    cutoff: cutoff.toISOString(),
  });
};

export const inventoryWorker = new Worker<InventoryJobPayload>(
  'inventory-jobs',
  async (job) => {
    try {
      switch (job.name as InventoryJobType) {
        case 'recalculate-analytics': {
          await processRecalculateAnalytics();
          break;
        }
        case 'send-low-stock-alerts': {
          await processSendLowStockAlerts();
          break;
        }
        case 'archive-old-logs': {
          await processArchiveOldLogs();
          break;
        }
        default: {
          logger.warn('inventory.jobs.unknown', { name: job.name });
        }
      }
      logger.info('inventory.job.completed', {
        id: job.id,
        name: job.name,
      });
    } catch (err: any) {
      logger.error('inventory.job.failed', {
        id: job.id,
        name: job.name,
        message: err.message,
      });
      throw err;
    }
  },
  { connection },
);

inventoryWorker.on('completed', (job) => {
  logger.info('inventory.job.event.completed', {
    id: job.id,
    name: job.name,
  });
});

inventoryWorker.on('failed', (job, err) => {
  logger.error('inventory.job.event.failed', {
    id: job?.id,
    name: job?.name,
    message: err.message,
  });
});
