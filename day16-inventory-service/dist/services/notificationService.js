"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = void 0;
const logger_1 = require("../utils/logger");
const inventoryQueue_1 = require("../queues/inventoryQueue");
/**
 * Fire-and-forget async notification dispatch.
 * Current behavior:
 * - Log to console/logger.
 * - Enqueue into BullMQ inventory queue if available.
 *
 * Future behavior:
 * - Replace internals with Email/SMS/Push providers while keeping the same API.
 */
const sendNotification = async (type, payload) => {
    const { requestId, ...safePayload } = payload;
    const meta = { type, requestId };
    // Basic console/log output (no sensitive data).
    logger_1.logger.info('notification.dispatch', {
        ...meta,
        payload: safePayload,
    });
    // Enqueue as a background job if BullMQ queue is configured.
    try {
        if (inventoryQueue_1.inventoryQueue) {
            const jobData = {
                type,
                payload: { ...payload },
            };
            await inventoryQueue_1.inventoryQueue.add('notification', jobData, {
                removeOnComplete: true,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
            });
            logger_1.logger.info('notification.queued', {
                ...meta,
            });
        }
        else {
            logger_1.logger.warn('notification.queue_unavailable', meta);
        }
    }
    catch (err) {
        logger_1.logger.error('notification.queue_failed', {
            ...meta,
            error: err.message,
        });
    }
};
exports.sendNotification = sendNotification;
