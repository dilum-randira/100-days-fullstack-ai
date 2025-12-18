import { eventBus, DOMAIN_EVENTS, DomainEvent } from './EventBus';
import { logger } from '../utils/logger';
import { emitRealtimeEvent } from '../sockets';
import { getInventorySummary, getLowStockItems } from '../services/inventoryService';
import { sendNotification } from '../services/notificationService';

// Analytics recalculation listener for InventoryAdjusted
eventBus.subscribe(DOMAIN_EVENTS.InventoryAdjusted, async (event: DomainEvent<any>) => {
  try {
    await getInventorySummary();
    logger.info('analytics.recalculated', {
      eventId: event.eventId,
      type: event.type,
    });
  } catch (err: any) {
    logger.error('analytics.recalculation.failed', {
      eventId: event.eventId,
      message: err.message,
    });
  }
});

// Low-stock alert trigger listener
eventBus.subscribe(DOMAIN_EVENTS.InventoryAdjusted, async (event: DomainEvent<any>) => {
  try {
    const lowStockItems = await getLowStockItems();
    logger.info('low_stock.check.completed', {
      eventId: event.eventId,
      type: event.type,
      count: lowStockItems.length,
    });
  } catch (err: any) {
    logger.error('low_stock.check.failed', {
      eventId: event.eventId,
      message: err.message,
    });
  }
});

// Websocket emission listeners
eventBus.subscribe(DOMAIN_EVENTS.InventoryAdjusted, async (event: DomainEvent<any>) => {
  try {
    const { itemId, oldQuantity, newQuantity, delta } = event.payload as any;
    emitRealtimeEvent('inventory:update', itemId, { oldQuantity, newQuantity, delta });
  } catch (err: any) {
    logger.error('realtime.inventory_event.listener_error', {
      eventId: event.eventId,
      message: err.message,
    });
  }
});

eventBus.subscribe(DOMAIN_EVENTS.BatchConsumed, async (event: DomainEvent<any>) => {
  try {
    const { batchId, remainingWeight, ...rest } = event.payload as any;
    emitRealtimeEvent('batch:update', batchId, { remainingWeight, ...rest });
  } catch (err: any) {
    logger.error('realtime.batch_event.listener_error', {
      eventId: event.eventId,
      message: err.message,
    });
  }
});

eventBus.subscribe(DOMAIN_EVENTS.BatchQCPassed, async (event: DomainEvent<any>) => {
  try {
    const { batchId, status, ...rest } = event.payload as any;
    emitRealtimeEvent('qc:status', batchId, { status, ...rest });
  } catch (err: any) {
    logger.error('realtime.qc_event.listener_error', {
      eventId: event.eventId,
      message: err.message,
    });
  }
});

// Notification: large inventory adjustments
const INVENTORY_ADJUSTMENT_THRESHOLD = 50; // units, adjust as needed

eventBus.subscribe(DOMAIN_EVENTS.InventoryAdjusted, async (event: DomainEvent<any>) => {
  const { itemId, oldQuantity, newQuantity, delta, requestId } = event.payload as any;

  if (Math.abs(delta) >= INVENTORY_ADJUSTMENT_THRESHOLD) {
    await sendNotification('SYSTEM_ALERT', {
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

eventBus.subscribe(DOMAIN_EVENTS.InventoryAdjusted, async (event: DomainEvent<any>) => {
  const { requestId } = event.payload as any;

  try {
    const lowStockItems = await getLowStockItems();

    if (lowStockItems.length > 0) {
      await sendNotification('LOW_STOCK', {
        message: `Low stock detected for ${lowStockItems.length} items`,
        count: lowStockItems.length,
        items: lowStockItems.map((i: any) => ({ id: i._id, sku: i.sku, quantity: i.quantity })),
        requestId,
      });
    }
  } catch (error: any) {
    logger.error('notification.low_stock.failed', {
      error: error.message,
      requestId,
    });
  }
});

// Notification: QC failed

eventBus.subscribe(DOMAIN_EVENTS.BatchQCPassed, async (event: DomainEvent<any>) => {
  const { batchId, status, reason, requestId } = event.payload as any;

  if (status === 'FAILED') {
    await sendNotification('QC_FAILED', {
      message: `QC failed for batch ${batchId}`,
      batchId,
      status,
      reason,
      requestId,
    });
  }
});
