import { InventoryItem, IInventoryItemDocument, InventoryStatus } from '../models/InventoryItem';
import { isValidObjectId } from 'mongoose';
import { InventoryLog, IInventoryLogDocument } from '../models/InventoryLog';
import { redisClient } from '../utils/redis';
import { logger } from '../utils/logger';
import { enqueueInventoryJobs } from '../queues/inventoryQueue';
import { emitRealtimeEvent } from '../sockets';

const CACHE_TTL_SECONDS = 60;

const buildCacheKey = (endpoint: string, params?: Record<string, unknown>): string => {
  const base = `inventory:${endpoint}`;
  if (!params || Object.keys(params).length === 0) return base;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(params).sort()) {
    sorted[key] = params[key];
  }
  return `${base}:${JSON.stringify(sorted)}`;
};

const safeGetCache = async <T>(key: string): Promise<T | null> => {
  if (!redisClient) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) {
      logger.debug?.('cache.miss', { key });
      return null;
    }
    logger.debug?.('cache.hit', { key });
    return JSON.parse(raw) as T;
  } catch (err: any) {
    logger.error('cache.get.error', { key, message: err.message });
    return null;
  }
};

const safeSetCache = async (key: string, value: unknown): Promise<void> => {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
  } catch (err: any) {
    logger.error('cache.set.error', { key, message: err.message });
  }
};

const clearInventoryCache = async (): Promise<void> => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys('inventory:*');
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info('cache.clear.inventory', { count: keys.length });
    }
  } catch (err: any) {
    logger.error('cache.clear.error', { message: err.message });
  }
};

export interface InventoryFilter {
  productName?: string;
  supplier?: string;
  location?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

export const createItem = async (data: Partial<IInventoryItemDocument>): Promise<IInventoryItemDocument> => {
  const item = new InventoryItem(data);
  await item.save();
  await clearInventoryCache();
  return item;
};

export const getItemById = async (id: string): Promise<IInventoryItemDocument> => {
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const item = await InventoryItem.findById(id).exec();
  if (!item) {
    throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  }
  return item;
};

export const updateItem = async (
  id: string,
  updates: Partial<IInventoryItemDocument>,
): Promise<IInventoryItemDocument> => {
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const item = await InventoryItem.findByIdAndUpdate(id, { $set: updates }, {
    new: true,
    runValidators: true,
  }).exec();

  if (!item) {
    throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  }

  await clearInventoryCache();
  return item;
};

export const deleteItem = async (id: string): Promise<void> => {
  if (!isValidObjectId(id)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const result = await InventoryItem.findByIdAndDelete(id).exec();
  if (!result) {
    throw Object.assign(new Error('Item not found'), { statusCode: 404 });
  }
  await clearInventoryCache();
};

export const listItems = async (
  filter: InventoryFilter,
  pagination: PaginationQuery,
): Promise<{ items: IInventoryItemDocument[]; total: number; page: number; limit: number }> => {
  const page = pagination.page && pagination.page > 0 ? pagination.page : DEFAULT_PAGE;
  const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  if (filter.productName) {
    query.productName = { $regex: filter.productName, $options: 'i' };
  }
  if (filter.supplier) {
    query.supplier = { $regex: filter.supplier, $options: 'i' };
  }
  if (filter.location) {
    query.location = { $regex: filter.location, $options: 'i' };
  }

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

  const item = await getItemById(id);
  const oldQuantity = item.quantity;
  const newQuantity = oldQuantity + delta;

  if (newQuantity < 0) {
    throw Object.assign(new Error('Quantity cannot be negative'), { statusCode: 400 });
  }

  item.quantity = newQuantity;
  await item.save();

  await InventoryLog.create({
    itemId: item._id,
    delta,
    oldQuantity,
    newQuantity,
  });

  await clearInventoryCache();

  await enqueueInventoryJobs([
    { name: 'recalculate-analytics', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
    { name: 'send-low-stock-alerts', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
    { name: 'archive-old-logs', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
  ]);

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

export const getInventorySummary = async (
  threshold?: number,
): Promise<{
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
}> => {
  const key = buildCacheKey('summary', { threshold });
  const cached = await safeGetCache<{
    totalItems: number;
    totalQuantity: number;
    lowStockCount: number;
  }>(key);
  if (cached) return cached;

  const totalItems = await InventoryItem.countDocuments().exec();

  const agg = await InventoryItem.aggregate([
    { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
  ]).exec();

  const totalQuantity = agg.length > 0 && typeof agg[0].totalQuantity === 'number' ? agg[0].totalQuantity : 0;

  let lowStockCount: number;
  if (threshold !== undefined) {
    if (typeof threshold !== 'number' || threshold < 0) {
      throw Object.assign(new Error('Threshold must be a non-negative number'), { statusCode: 400 });
    }
    lowStockCount = await InventoryItem.countDocuments({ quantity: { $lt: threshold } }).exec();
  } else {
    lowStockCount = await InventoryItem.countDocuments({ $expr: { $lt: ['$quantity', '$minThreshold'] } }).exec();
  }

  const result = { totalItems, totalQuantity, lowStockCount };
  await safeSetCache(key, result);
  return result;
};

export const getInventoryStats = async (): Promise<unknown> => {
  const key = buildCacheKey('stats');
  const cached = await safeGetCache<unknown>(key);
  if (cached) return cached;

  // implement your stats aggregation here
  const stats = await InventoryItem.aggregate([
    { $group: { _id: '$location', quantity: { $sum: '$quantity' } } },
  ]).exec();

  const shaped = stats.map((row) => ({ location: row._id, quantity: row.quantity }));
  await safeSetCache(key, shaped);
  return shaped;
};

export const getTopInventory = async (limit: number = 10): Promise<IInventoryItemDocument[]> => {
  const safeLimit = limit > 0 ? limit : 10;
  const key = buildCacheKey('top', { limit: safeLimit });
  const cached = await safeGetCache<IInventoryItemDocument[]>(key);
  if (cached) return cached;

  const items = await InventoryItem.find().sort({ quantity: -1 }).limit(safeLimit).exec();
  await safeSetCache(key, items);
  return items;
};

export const getLogsForItem = async (
  itemId: string,
  page: number = 1,
  limit: number = 20,
): Promise<{ logs: IInventoryLogDocument[]; total: number; page: number; limit: number }> => {
  if (!isValidObjectId(itemId)) {
    throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
  }

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 20;
  const skip = (safePage - 1) * safeLimit;

  const [logs, total] = await Promise.all([
    InventoryLog.find({ itemId }).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).exec(),
    InventoryLog.countDocuments({ itemId }).exec(),
  ]);

  return { logs, total, page: safePage, limit: safeLimit };
};

export const triggerInventoryBackgroundJobs = async (trigger: 'quantity-adjusted' | 'batch-consumed' | 'qc-passed', itemId?: string): Promise<void> => {
  await enqueueInventoryJobs([
    { name: 'recalculate-analytics', data: { itemId, trigger } },
    { name: 'send-low-stock-alerts', data: { itemId, trigger } },
    { name: 'archive-old-logs', data: { itemId, trigger } },
  ]);
};
