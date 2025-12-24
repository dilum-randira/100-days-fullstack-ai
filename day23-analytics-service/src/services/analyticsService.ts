import { InventoryItem as InventoryItemModel } from '../models';
import { getReadConnection } from '../db/router';

export interface InventorySummary {
  totalItems: number;
  totalQuantity: number;
}

export interface TrendingItem {
  sku: string;
  productName: string;
  totalQuantity: number;
}

export interface TopItem extends TrendingItem {}

const getReadModel = async () => {
  const conn = await getReadConnection();
  // reuse schema but bind model to read connection
  return conn.model('InventoryItem', (InventoryItemModel as any).schema);
};

export const getInventorySummary = async (): Promise<InventorySummary> => {
  const InventoryItem = await getReadModel();

  const totalItems = await InventoryItem.countDocuments().exec();
  const agg = await InventoryItem.aggregate([{ $group: { _id: null, totalQuantity: { $sum: '$quantity' } } }]).exec();
  const totalQuantity = agg.length > 0 && typeof (agg as any)[0].totalQuantity === 'number' ? (agg as any)[0].totalQuantity : 0;

  return { totalItems, totalQuantity };
};

export const getTrendingItems = async (limit = 10): Promise<TrendingItem[]> => {
  const InventoryItem = await getReadModel();

  const items = await InventoryItem.aggregate([
    { $sort: { updatedAt: -1 } },
    { $limit: limit },
    { $project: { _id: 0, sku: 1, productName: 1, totalQuantity: '$quantity' } },
  ]).exec();

  return items as TrendingItem[];
};

export const getTopItems = async (limit = 10): Promise<TopItem[]> => {
  const InventoryItem = await getReadModel();

  const items = await InventoryItem.aggregate([
    { $sort: { quantity: -1 } },
    { $limit: limit },
    { $project: { _id: 0, sku: 1, productName: 1, totalQuantity: '$quantity' } },
  ]).exec();

  return items as TopItem[];
};
