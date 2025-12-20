import { Router } from 'express';
import {
  createInventoryItem,
  listInventoryItems,
  getInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  adjustInventoryQuantity,
  getLowStockInventoryItems,
  getInventorySummaryHandler,
  getInventoryStatsHandler,
  getTopInventoryHandler,
  getItemLogsHandler,
  restoreItem,
} from '../controllers/inventoryController';

const router = Router();

router.post('/', createInventoryItem);
router.get('/', listInventoryItems);
router.get('/low-stock', getLowStockInventoryItems);
router.get('/summary', getInventorySummaryHandler);
router.get('/stats', getInventoryStatsHandler);
router.get('/top', getTopInventoryHandler);
router.get('/:id/logs', getItemLogsHandler);
router.get('/:id', getInventoryItem);
router.put('/:id', updateInventoryItem);
router.delete('/:id', deleteInventoryItem);
router.post('/:id/adjust', adjustInventoryQuantity);
router.post('/:id/restore', restoreItem);

export default router;
