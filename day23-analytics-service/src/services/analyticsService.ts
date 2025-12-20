import { InventoryItem } from '../models';

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

export const getInventorySummary = async (): Promise<InventorySummary> => {
  const totalItems = await InventoryItem.countDocuments().exec();
  const agg = await InventoryItem.aggregate([
    { $group: { _id: null, totalQuantity: { $sum: '$quantity' } } },
  ]).exec();
  const totalQuantity = agg.length > 0 && typeof agg[0].totalQuantity === 'number'
    ? agg[0].totalQuantity
    : 0;

  return { totalItems, totalQuantity };
};

export const getTrendingItems = async (limit = 10): Promise<TrendingItem[]> => {
  const items = await InventoryItem.aggregate([
    { $sort: { updatedAt: -1 } },
    { $limit: limit },
    { $project: { _id: 0, sku: 1, productName: 1, totalQuantity: '$quantity' } },
  ]).exec();

  return items as TrendingItem[];
};

export const getTopItems = async (limit = 10): Promise<TopItem[]> => {
  const items = await InventoryItem.aggregate([
    { $sort: { quantity: -1 } },
    { $limit: limit },
    { $project: { _id: 0, sku: 1, productName: 1, totalQuantity: '$quantity' } },
  ]).exec();

  return items as TopItem[];
};
