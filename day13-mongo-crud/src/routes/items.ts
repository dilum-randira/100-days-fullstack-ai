import { Router } from 'express';
import {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  searchItems,
} from '../controllers/itemController';
import { validateObjectId } from '../middlewares/validateObjectId';

const router = Router();

/**
 * @route   GET /api/items/search
 * @desc    Search items by name
 * @query   q - search query string
 */
router.get('/search', searchItems);

/**
 * @route   GET /api/items
 * @desc    Get all items with pagination
 * @query   page - page number (default: 1)
 * @query   limit - items per page (default: 10)
 * @query   sortBy - field to sort by (default: createdAt)
 * @query   sortOrder - asc or desc (default: desc)
 */
router.get('/', getAllItems);

/**
 * @route   GET /api/items/:id
 * @desc    Get single item by ID
 */
router.get('/:id', validateObjectId, getItemById);

/**
 * @route   POST /api/items
 * @desc    Create new item
 * @body    { name: string, quantity: number, price: number }
 */
router.post('/', createItem);

/**
 * @route   PUT /api/items/:id
 * @desc    Update item by ID
 * @body    { name?: string, quantity?: number, price?: number }
 */
router.put('/:id', validateObjectId, updateItem);

/**
 * @route   DELETE /api/items/:id
 * @desc    Delete item by ID
 */
router.delete('/:id', validateObjectId, deleteItem);

export default router;
