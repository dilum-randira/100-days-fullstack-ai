"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryController = __importStar(require("../controllers/inventoryController"));
const featureFlags_1 = require("../middleware/featureFlags");
const exportService_1 = require("../services/exportService");
const router = (0, express_1.Router)();
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
router.get('/export/inventory', exportService_1.exportInventory);
router.get('/export/logs', exportService_1.exportLogs);
router.get('/export/batches', exportService_1.exportBatches);
router.patch('/:id/adjust', (0, featureFlags_1.requireFeature)('inventory.adjust'), inventoryController.adjustInventoryQuantity);
// QC-related routes (example: webhook)
router.post('/qc/webhook', (0, featureFlags_1.requireFeature)('qc.webhook'), inventoryController.qcWebhookHandler);
exports.default = router;
