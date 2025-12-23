"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryWorker = exports.enqueueInventoryJobs = exports.inventoryQueueScheduler = exports.inventoryQueue = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_1 = require("../utils/redis");
const logger_1 = require("../utils/logger");
const InventoryItem_1 = require("../models/InventoryItem");
const InventoryLog_1 = require("../models/InventoryLog");
const connection = redis_1.redisClient ?? new ioredis_1.default(process.env.REDIS_URL ?? '');
exports.inventoryQueue = new bullmq_1.Queue('inventory-jobs', {
    connection,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
});
exports.inventoryQueueScheduler = new bullmq_1.QueueScheduler('inventory-jobs', { connection });
const enqueueInventoryJobs = async (jobs) => {
    try {
        await exports.inventoryQueue.addBulk(jobs.map((job) => ({
            name: job.name,
            data: job.data,
        })));
        logger_1.logger.info('inventory.jobs.enqueued', { count: jobs.length });
    }
    catch (err) {
        logger_1.logger.error('inventory.jobs.enqueue.error', { message: err.message });
    }
};
exports.enqueueInventoryJobs = enqueueInventoryJobs;
const processRecalculateAnalytics = async () => {
    const totalItems = await InventoryItem_1.InventoryItem.countDocuments().exec();
    const agg = await InventoryItem_1.InventoryItem.aggregate([
        { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
    ]).exec();
    const totalQuantity = agg.length > 0 && typeof agg[0].totalQuantity === 'number' ? agg[0].totalQuantity : 0;
    logger_1.logger.info('inventory.analytics.recalculated', {
        totalItems,
        totalQuantity,
    });
};
const processSendLowStockAlerts = async () => {
    const lowStockItems = await InventoryItem_1.InventoryItem.find({ $expr: { $lt: ['$quantity', '$minThreshold'] } }).exec();
    if (lowStockItems.length === 0) {
        logger_1.logger.info('inventory.lowStockAlerts.none');
        return;
    }
    lowStockItems.forEach((item) => {
        const message = `Low stock alert for ${item.productName} at ${item.location}: quantity=${item.quantity}, minThreshold=${item.minThreshold}`;
        logger_1.logger.warn('inventory.lowStockAlert', {
            itemId: item._id,
            productName: item.productName,
            location: item.location,
            quantity: item.quantity,
            minThreshold: item.minThreshold,
        });
        console.log(message);
    });
};
const processArchiveOldLogs = async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const result = await InventoryLog_1.InventoryLog.deleteMany({ createdAt: { $lt: cutoff } }).exec();
    logger_1.logger.info('inventory.logs.archived', {
        deletedCount: result.deletedCount ?? 0,
        cutoff: cutoff.toISOString(),
    });
};
exports.inventoryWorker = new bullmq_1.Worker('inventory-jobs', async (job) => {
    try {
        switch (job.name) {
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
                logger_1.logger.warn('inventory.jobs.unknown', { name: job.name });
            }
        }
        logger_1.logger.info('inventory.job.completed', {
            id: job.id,
            name: job.name,
        });
    }
    catch (err) {
        logger_1.logger.error('inventory.job.failed', {
            id: job.id,
            name: job.name,
            message: err.message,
        });
        throw err;
    }
}, { connection });
exports.inventoryWorker.on('completed', (job) => {
    logger_1.logger.info('inventory.job.event.completed', {
        id: job.id,
        name: job.name,
    });
});
exports.inventoryWorker.on('failed', (job, err) => {
    logger_1.logger.error('inventory.job.event.failed', {
        id: job?.id,
        name: job?.name,
        message: err.message,
    });
});
