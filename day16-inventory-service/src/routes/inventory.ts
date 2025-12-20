import { Router } from 'express';
import * as inventoryController from '../controllers/inventoryController';
import { requireFeature } from '../middleware/featureFlags';
import { exportInventory, exportLogs, exportBatches } from '../services/exportService';

const router = Router();

router.post('/', inventoryController.createInventoryItem);
router.get('/', inventoryController.listInventoryItems);
router.get('/low-stock', inventoryController.getLowStockInventoryItems);
router.get('/summary', inventoryController.getInventorySummaryHandler);
router.get('/stats', inventoryController.getInventoryStatsHandler);
router.get('/top', inventoryController.getTopInventoryHandler);
router.get('/:id/logs', inventoryController.getItemLogsHandler);
router.get('/:id', inventoryController.getInventoryItem);
router.put('/:id', inventoryController.updateInventoryItem);
router.delete('/:id', inventoryController.deleteInventoryItem);
router.post('/:id/restore', inventoryController.restoreItem);
router.get('/export/inventory', exportInventory);
router.get('/export/logs', exportLogs);
router.get('/export/batches', exportBatches);
router.patch('/:id/adjust', requireFeature('inventory.adjust'), inventoryController.adjustInventoryQuantity);

// QC-related routes (example: webhook)
router.post('/qc/webhook', requireFeature('qc.webhook'), inventoryController.qcWebhookHandler);

export default router;
