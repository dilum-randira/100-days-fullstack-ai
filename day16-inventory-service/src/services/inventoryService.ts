import mongoose from 'mongoose';
import { InventoryItem, IInventoryItemDocument, InventoryStatus } from '../models/InventoryItem';
import { isValidObjectId } from 'mongoose';
import { InventoryLog, IInventoryLogDocument } from '../models/InventoryLog';
import { logger } from '../utils/logger';
import { enqueueInventoryJobs } from '../queues/inventoryQueue';
import { emitRealtimeEvent } from '../sockets';
import { eventBus, DOMAIN_EVENTS } from '../events/EventBus';
import { writeOutboxEvent } from '../outbox/writeOutboxEvent';
import { fetchInventorySummary, fetchTopItems, fetchTrendingItems } from './analyticsClient';
import { cacheGet, cacheInvalidatePrefix, cacheSet } from '../utils/cache/cache';
import { config } from '../config';

const ANALYTICS_CACHE_TTL_SECONDS = 60;

const buildCacheKey = (endpoint: string, params?: Record<string, unknown>): string => {
  const base = `inventory:${endpoint}`;
  if (!params || Object.keys(params).length === 0) return base;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(params).sort()) {
    sorted[key] = params[key];
  }
  return `${base}:${JSON.stringify(sorted)}`;
};

const clearInventoryCache = async (): Promise<void> => {
  await cacheInvalidatePrefix('inventory:');
};

const requireOrgInProd = (organizationId?: string): void => {
  if (config.nodeEnv !== 'production') return;
  if (!config.sharding.requiredInProd) return;
  if (!organizationId) {
    throw Object.assign(new Error('organizationId is required'), { statusCode: 400 });
  }
};

export interface InventoryFilter {
  organizationId?: string;
  productName?: string;
  supplier?: string;
  location?: string;
  includeDeleted?: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export const createItem = async (data: Partial<IInventoryItemDocument>): Promise<IInventoryItemDocument> => {
  requireOrgInProd((data as any).organizationId);

  const item = new InventoryItem(data);
  await item.save();
  await clearInventoryCache();
  return item;
};

export const getItemById = async (id: string, organizationId?: string): Promise<IInventoryItemDocument> => {
  requireOrgInProd(organizationId);

  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const query: Record<string, unknown> = { _id: id, isDeleted: { $ne: true } };
  if (organizationId) query.organizationId = organizationId;

  const item = await InventoryItem.findOne(query).exec();
  if (!item) {
    throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  }
  return item;
};

export const updateItem = async (
  id: string,
  updates: Partial<IInventoryItemDocument>,
  organizationId?: string,
): Promise<IInventoryItemDocument> => {
  requireOrgInProd(organizationId);

  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const filter: Record<string, unknown> = { _id: id };
  if (organizationId) filter.organizationId = organizationId;

  const item = await InventoryItem.findOneAndUpdate(filter, { $set: updates }, {
    new: true,
    runValidators: true,
  }).exec();

  if (!item) {
    throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  }

  await clearInventoryCache();
  return item;
};

export const deleteItem = async (id: string, organizationId?: string): Promise<void> => {
  requireOrgInProd(organizationId);

  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const filter: Record<string, unknown> = { _id: id, isDeleted: { $ne: true } };
  if (organizationId) filter.organizationId = organizationId;

  const result = await InventoryItem.findOneAndUpdate(
    filter,
    { $set: { isDeleted: true, deletedAt: new Date() } },
    { new: true },
  ).exec();

  if (!result) {
    throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  }
  await clearInventoryCache();
};

export const restoreItem = async (id: string): Promise<IInventoryItemDocument> => {
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const item = await InventoryItem.findOneAndUpdate(
    { _id: id, isDeleted: true },
    { $set: { isDeleted: false, deletedAt: null } },
    { new: true },
  ).exec();

  if (!item) {
    throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  }

  await clearInventoryCache();
  return item;
};

export const listItems = async (
  filter: InventoryFilter,
  pagination: PaginationQuery,
): Promise<{ items: IInventoryItemDocument[]; total: number; page: number; limit: number }> => {
  requireOrgInProd(filter.organizationId);

  const page = pagination.page && pagination.page > 0 ? pagination.page : DEFAULT_PAGE;
  const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (filter.organizationId) {
    query.organizationId = filter.organizationId;
  }

  if (!filter.includeDeleted) {
    query.isDeleted = { $ne: true };
  }
  if (filter.productName) {
    query.productName = { $regex: filter.productName, $options: 'i' };
  }
  if (filter.supplier) {
    query.supplier = { $regex: filter.supplier, $options: 'i' };
  }
  if (filter.location) {
    query.location = { $regex: filter.location, $options: 'i' };
  }

  logger.info('shard.query', {
    organizationId: filter.organizationId || null,
    targeted: Boolean(filter.organizationId),
    op: 'listItems',
  });

  const [items, total] = await Promise.all([
    InventoryItem.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
    InventoryItem.countDocuments(query).exec(),
  ]);

  return { items, total, page, limit };
};

export const adjustQuantity = async (id: string, delta: number): Promise<IInventoryItemDocument> => {
  if (!Number.isInteger(delta)) {
    throw Object.assign(new Error('Delta must be an integer'), { statusCode: 400 });
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  logger.info('transaction.start', { operation: 'adjustQuantity', itemId: id });

  try {
    const item = await InventoryItem.findById(id).session(session).exec();
    if (!item) {
      throw Object.assign(new Error('Item not found'), { statusCode: 404 });
    }

    const oldQuantity = item.quantity;
    const newQuantity = oldQuantity + delta;

    if (newQuantity < 0) {
      throw Object.assign(new Error('Quantity cannot be negative'), { statusCode: 400 });
    }

    item.quantity = newQuantity;
    await item.save({ session });

    await InventoryLog.create(
      [
        {
          itemId: item._id,
          delta,
          oldQuantity,
          newQuantity,
        },
      ],
      { session },
    );

    await writeOutboxEvent(session, {
      aggregateType: 'InventoryItem',
      aggregateId: String(item._id),
      eventType: 'InventoryAdjusted',
      payload: {
        itemId: String(item._id),
        oldQuantity,
        newQuantity,
        delta,
        organizationId: (item as any).organizationId,
      },
    });

    await session.commitTransaction();
    logger.info('transaction.commit', { operation: 'adjustQuantity', itemId: String(item._id) });

    // Non-transactional side effects
    await clearInventoryCache();

    await enqueueInventoryJobs([
      { name: 'recalculate-analytics', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
      { name: 'send-low-stock-alerts', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
      { name: 'archive-old-logs', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
    ]);

    await eventBus.publish(DOMAIN_EVENTS.InventoryAdjusted, {
      itemId: String(item._id),
      oldQuantity,
      newQuantity,
      delta,
    });

    try {
      emitRealtimeEvent('inventory:update', String(item._id), {
        oldQuantity,
        newQuantity,
        delta,
      });
    } catch (err: any) {
      logger.error('realtime.inventory_update.error', {
        itemId: String(item._id),
        message: err.message,
      });
    }

    return item;
  } catch (error) {
    await session.abortTransaction();
    logger.error('transaction.abort', { operation: 'adjustQuantity', itemId: id, message: (error as any).message });
    throw error;
  } finally {
    session.endSession();
  }
};

// Helper to run arbitrary operations inside a transaction for batch/QC flows
export const withInventoryTransaction = async <T>(
  operation: string,
  fn: (session: mongoose.ClientSession) => Promise<T>,
): Promise<T> => {
  const session = await mongoose.startSession();
  session.startTransaction();
  logger.info('transaction.start', { operation });

  try {
    const result = await fn(session);
    await session.commitTransaction();
    logger.info('transaction.commit', { operation });
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error('transaction.abort', { operation, message: (error as any).message });
    throw error;
  } finally {
    session.endSession();
  }
};

export const publishBatchConsumedEvent = async (
  batchId: string,
  payload: { remainingWeight: number; [key: string]: unknown },
): Promise<void> => {
  await eventBus.publish(DOMAIN_EVENTS.BatchConsumed, {
    batchId,
    ...payload,
  });
};

export const publishBatchQCPassedEvent = async (
  batchId: string,
  payload: { status: string; [key: string]: unknown },
): Promise<void> => {
  await eventBus.publish(DOMAIN_EVENTS.BatchQCPassed, {
    batchId,
    ...payload,
  });
};

export const emitBatchUpdateEvent = (
  batchId: string,
  data: { remainingWeight: number; [key: string]: unknown },
): void => {
  try {
    emitRealtimeEvent('batch:update', batchId, data);
  } catch (err: any) {
    logger.error('realtime.batch_update.error', { batchId, message: err.message });
  }
};

export const emitQcStatusEvent = (
  batchId: string,
  data: { status: string; [key: string]: unknown },
): void => {
  try {
    emitRealtimeEvent('qc:status', batchId, data);
  } catch (err: any) {
    logger.error('realtime.qc_status.error', { batchId, message: err.message });
  }
};

export const getLowStockItems = async (threshold?: number): Promise<IInventoryItemDocument[]> => {
  if (threshold !== undefined && threshold < 0) {
    throw Object.assign(new Error('Threshold cannot be negative'), { statusCode: 400 });
  }

  if (threshold !== undefined) {
    return InventoryItem.find({ quantity: { $lt: threshold } }).exec();
  }

  return InventoryItem.find({ $expr: { $lt: ['$quantity', '$minThreshold'] } }).exec();
};

export const getInventorySummary = async (threshold?: number) => {
  // threshold is accepted for backward compatibility with existing controller/query API.
  // Current summary is provided by analytics service and isn't threshold-specific.
  void threshold;

  const cacheKey = buildCacheKey('analytics:summary');
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached.value !== null) return cached.value;

  const summary = await fetchInventorySummary();
  await cacheSet(cacheKey, summary, ANALYTICS_CACHE_TTL_SECONDS);

  return summary;
};

export const getTrendingItemsCached = async (limit = 10) => {
  const cacheKey = buildCacheKey('analytics:trending', { limit });
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached.value !== null) return cached.value;

  const items = await fetchTrendingItems(limit);
  await cacheSet(cacheKey, items, ANALYTICS_CACHE_TTL_SECONDS);
  return items;
};

export const getTopInventory = async (limit = 10) => {
  const cacheKey = buildCacheKey('analytics:top', { limit });
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached.value !== null) return cached.value;

  const items = await fetchTopItems(limit);
  await cacheSet(cacheKey, items, ANALYTICS_CACHE_TTL_SECONDS);
  return items;
};

/**
 * Inventory stats derived from MongoDB (kept local for resilience when analytics is unavailable).
 */
export const getInventoryStats = async (): Promise<{
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
}> => {
  const [totalItems, agg] = await Promise.all([
    InventoryItem.countDocuments({ isDeleted: { $ne: true } }).exec(),
    InventoryItem.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
          lowStockCount: {
            $sum: {
              $cond: [{ $lt: ['$quantity', '$minThreshold'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalQuantity: { $ifNull: ['$totalQuantity', 0] },
          totalValue: { $ifNull: ['$totalValue', 0] },
          lowStockCount: { $ifNull: ['$lowStockCount', 0] },
        },
      },
    ]).exec(),
  ]);

  const row = (agg && agg[0]) || { totalQuantity: 0, totalValue: 0, lowStockCount: 0 };

  return {
    totalItems,
    totalQuantity: Number(row.totalQuantity) || 0,
    totalValue: Number(row.totalValue) || 0,
    lowStockCount: Number(row.lowStockCount) || 0,
  };
};

/**
 * Paginated logs for a specific item.
 */
export const getLogsForItem = async (
  itemId: string,
  page = 1,
  limit = 20,
): Promise<{ logs: IInventoryLogDocument[]; total: number; page: number; limit: number }> => {
  if (!isValidObjectId(itemId)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 200) : 20;
  const skip = (safePage - 1) * safeLimit;

  const query = { itemId: new mongoose.Types.ObjectId(itemId) } as any;

  const [logs, total] = await Promise.all([
    InventoryLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).exec(),
    InventoryLog.countDocuments(query).exec(),
  ]);

  return { logs, total, page: safePage, limit: safeLimit };
};

export const getTopItems = async () => {
  const cacheKey = 'analytics:inventory:top-items';
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;

  const items = await fetchTopItems(10);
  await cacheSet(cacheKey, items);

  return items;
};

export const getTrendingItems = async () => {
  const cacheKey = 'analytics:inventory:trending-items';
  const cached = await cacheGet<unknown>(cacheKey);
  if (cached) return cached;

  const trendingItems = await fetchTrendingItems();
  await cacheSet(cacheKey, trendingItems);

  return trendingItems;
};
