import { InventoryItem, IInventoryItemDocument, InventoryStatus } from '../models/InventoryItem';
import { isValidObjectId } from 'mongoose';
import { InventoryLog, IInventoryLogDocument } from '../models/InventoryLog';

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
  updates: Partial<IInventoryItemDocument>
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
};

export const listItems = async (
  filter: InventoryFilter,
  pagination: PaginationQuery
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

  return item;
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
  threshold?: number
): Promise<{
  totalItems: number;
  totalQuantity: number;
  lowStockCount: number;
}> => {
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

  return { totalItems, totalQuantity, lowStockCount };
};

export const getLogsForItem = async (
  itemId: string,
  page: number = 1,
  limit: number = 20
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
