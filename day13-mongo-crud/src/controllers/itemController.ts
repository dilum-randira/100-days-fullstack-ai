import { Request, Response, NextFunction } from 'express';
import { itemService, CreateItemInput, UpdateItemInput } from '../services/itemService';

/**
 * @desc    Get all items
 * @route   GET /api/items
 * @access  Public
 */
export const getAllItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const result = await itemService.getAllItems({ page, limit, sortBy, sortOrder });

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single item by ID
 * @route   GET /api/items/:id
 * @access  Public
 */
export const getItemById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const item = await itemService.getItemById(req.params.id);

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new item
 * @route   POST /api/items
 * @access  Public
 */
export const createItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input: CreateItemInput = {
      name: req.body.name,
      quantity: req.body.quantity,
      price: req.body.price,
    };

    const item = await itemService.createItem(input);

    res.status(201).json({
      success: true,
      message: 'Item created successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update item
 * @route   PUT /api/items/:id
 * @access  Public
 */
export const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const input: UpdateItemInput = {};

    if (req.body.name !== undefined) input.name = req.body.name;
    if (req.body.quantity !== undefined) input.quantity = req.body.quantity;
    if (req.body.price !== undefined) input.price = req.body.price;

    const item = await itemService.updateItem(req.params.id, input);

    res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete item
 * @route   DELETE /api/items/:id
 * @access  Public
 */
export const deleteItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const item = await itemService.deleteItem(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Item deleted successfully',
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search items by name
 * @route   GET /api/items/search
 * @access  Public
 */
export const searchItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = (req.query.q as string) || '';
    const items = await itemService.searchItems(query);

    res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};
