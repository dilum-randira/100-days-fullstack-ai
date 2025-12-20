import { Request, Response, NextFunction } from 'express';
import {
  createItem,
  getItemById,
  updateItem,
  deleteItem,
  listItems,
  adjustQuantity,
  getLowStockItems,
  getInventorySummary,
  getInventoryStats,
  getTopInventory,
  getLogsForItem,
  restoreItem as restoreInventoryItem,
} from '../services/inventoryService';
import { validateInventoryInput } from '../utils/validators';
import { InventoryLog } from '../models/InventoryLog';

export const createInventoryItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validation = validateInventoryInput(req.body);
    if (!validation.valid) {
      res.status(400).json({ success: false, error: validation.message });
      return;
    }

    const item = await createItem(req.body);

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const listInventoryItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, productName, supplier, location, includeDeleted } = req.query;

    const result = await listItems(
      {
        productName: productName as string | undefined,
        supplier: supplier as string | undefined,
        location: location as string | undefined,
        includeDeleted: includeDeleted === 'true',
      },
      {
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
      }
    );

    res.status(200).json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getInventoryItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await getItemById(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await updateItem(req.params.id, req.body);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const deleteInventoryItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await deleteItem(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const adjustInventoryQuantity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { delta } = req.body;

    if (typeof delta !== 'number') {
      res.status(400).json({ success: false, error: 'delta must be a number' });
      return;
    }

    const item = await adjustQuantity(req.params.id, delta);

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const getLowStockInventoryItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { threshold } = req.query;

    const numericThreshold = threshold ? Number(threshold) : undefined;

    const items = await getLowStockItems(numericThreshold);

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

export const getInventorySummaryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const threshold = req.query.threshold ? Number(req.query.threshold) : undefined;
    const summary = await getInventorySummary(threshold);

    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

export const getInventoryStatsHandler = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await getInventoryStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

export const getTopInventoryHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const items = await getTopInventory(limit);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

export const getItemLogsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await getLogsForItem(id, page, limit);

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const restoreItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await restoreInventoryItem(req.params.id);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};
