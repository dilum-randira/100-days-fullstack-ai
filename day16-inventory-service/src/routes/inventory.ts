import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController';
import { requireFeature } from '../middleware/featureFlags';
import { exportInventory, exportLogs, exportBatches } from '../services/exportService';
import { requireShardKey } from '../middleware/shardKey';

const router = Router();

router.post('/', requireShardKey, inventoryController.createInventoryItem);
router.get('/', requireShardKey, inventoryController.listInventoryItems);
router.get('/low-stock', requireShardKey, inventoryController.getLowStockInventoryItems);
router.get('/summary', requireShardKey, inventoryController.getInventorySummaryHandler);
router.get('/stats', requireShardKey, inventoryController.getInventoryStatsHandler);
router.get('/top', requireShardKey, inventoryController.getTopInventoryHandler);
router.get('/:id/logs', requireShardKey, inventoryController.getItemLogsHandler);
router.get('/:id', requireShardKey, inventoryController.getInventoryItem);
router.put('/:id', requireShardKey, inventoryController.updateInventoryItem);
router.delete('/:id', requireShardKey, inventoryController.deleteInventoryItem);
router.post('/:id/restore', requireShardKey, inventoryController.restoreItem);
router.get('/export/inventory', requireShardKey, exportInventory);
router.get('/export/logs', requireShardKey, exportLogs);
router.get('/export/batches', requireShardKey, exportBatches);
router.patch('/:id/adjust', requireShardKey, requireFeature('inventory.adjust'), inventoryController.adjustInventoryQuantity);

// QC-related routes (example: webhook)
router.post('/qc/webhook', requireShardKey, requireFeature('qc.webhook'), inventoryController.qcWebhookHandler);

export default router;
