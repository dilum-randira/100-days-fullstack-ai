import { Router } from 'express';
import {
  createInventoryItem,
  listInventoryItems,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryQuantity,
  getLowStockInventoryItems,
} from '../controllers/inventoryController';

const router = Router();

router.post('/', createInventoryItem);
router.get('/', listInventoryItems);
router.get('/low-stock', getLowStockInventoryItems);
router.get('/:id', getInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);
router.post('/:id/adjust', adjustInventoryQuantity);

export default router;
