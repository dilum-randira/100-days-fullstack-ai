"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventBus_1 = require("./EventBus");
const logger_1 = require("../utils/logger");
const sockets_1 = require("../sockets");
const inventoryService_1 = require("../services/inventoryService");
const notificationService_1 = require("../services/notificationService");
// Analytics recalculation listener for InventoryAdjusted
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.InventoryAdjusted, async (event) => {
    try {
        await (0, inventoryService_1.getInventorySummary)();
        logger_1.logger.info('analytics.recalculated', {
            eventId: event.eventId,
            type: event.type,
        });
    }
    catch (err) {
        logger_1.logger.error('analytics.recalculation.failed', {
            eventId: event.eventId,
            message: err.message,
        });
    }
});
// Low-stock alert trigger listener
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.InventoryAdjusted, async (event) => {
    try {
        const lowStockItems = await (0, inventoryService_1.getLowStockItems)();
        logger_1.logger.info('low_stock.check.completed', {
            eventId: event.eventId,
            type: event.type,
            count: lowStockItems.length,
        });
    }
    catch (err) {
        logger_1.logger.error('low_stock.check.failed', {
            eventId: event.eventId,
            message: err.message,
        });
    }
});
// Websocket emission listeners
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.InventoryAdjusted, async (event) => {
    try {
        const { itemId, oldQuantity, newQuantity, delta } = event.payload;
        (0, sockets_1.emitRealtimeEvent)('inventory:update', itemId, { oldQuantity, newQuantity, delta });
    }
    catch (err) {
        logger_1.logger.error('realtime.inventory_event.listener_error', {
            eventId: event.eventId,
            message: err.message,
        });
    }
});
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.BatchConsumed, async (event) => {
    try {
        const { batchId, remainingWeight, ...rest } = event.payload;
        (0, sockets_1.emitRealtimeEvent)('batch:update', batchId, { remainingWeight, ...rest });
    }
    catch (err) {
        logger_1.logger.error('realtime.batch_event.listener_error', {
            eventId: event.eventId,
            message: err.message,
        });
    }
});
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.BatchQCPassed, async (event) => {
    try {
        const { batchId, status, ...rest } = event.payload;
        (0, sockets_1.emitRealtimeEvent)('qc:status', batchId, { status, ...rest });
    }
    catch (err) {
        logger_1.logger.error('realtime.qc_event.listener_error', {
            eventId: event.eventId,
            message: err.message,
        });
    }
});
// Notification: large inventory adjustments
const INVENTORY_ADJUSTMENT_THRESHOLD = 50; // units, adjust as needed
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.InventoryAdjusted, async (event) => {
    const { itemId, oldQuantity, newQuantity, delta, requestId } = event.payload;
    if (Math.abs(delta) >= INVENTORY_ADJUSTMENT_THRESHOLD) {
        await (0, notificationService_1.sendNotification)('SYSTEM_ALERT', {
            message: `Large inventory adjustment detected for item ${itemId}: delta=${delta}`,
            itemId,
            oldQuantity,
            newQuantity,
            delta,
            requestId,
        });
    }
});
// Notification: low stock detected after inventory adjustment
// (Reuses getLowStockItems from existing analytics listener.)
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.InventoryAdjusted, async (event) => {
    const { requestId } = event.payload;
    try {
        const lowStockItems = await (0, inventoryService_1.getLowStockItems)();
        if (lowStockItems.length > 0) {
            await (0, notificationService_1.sendNotification)('LOW_STOCK', {
                message: `Low stock detected for ${lowStockItems.length} items`,
                count: lowStockItems.length,
                items: lowStockItems.map((i) => ({ id: i._id, sku: i.sku, quantity: i.quantity })),
                requestId,
            });
        }
    }
    catch (error) {
        logger_1.logger.error('notification.low_stock.failed', {
            error: error.message,
            requestId,
        });
    }
});
// Notification: QC failed
EventBus_1.eventBus.subscribe(EventBus_1.DOMAIN_EVENTS.BatchQCPassed, async (event) => {
    const { batchId, status, reason, requestId } = event.payload;
    if (status === 'FAILED') {
        await (0, notificationService_1.sendNotification)('QC_FAILED', {
            message: `QC failed for batch ${batchId}`,
            batchId,
            status,
            reason,
            requestId,
        });
    }
});
