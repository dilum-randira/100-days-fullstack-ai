"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restoreItem = exports.getItemLogsHandler = exports.getTopInventoryHandler = exports.getInventoryStatsHandler = exports.getInventorySummaryHandler = exports.getLowStockInventoryItems = exports.adjustInventoryQuantity = exports.deleteInventoryItem = exports.updateInventoryItem = exports.getInventoryItem = exports.listInventoryItems = exports.createInventoryItem = void 0;
const inventoryService_1 = require("../services/inventoryService");
const validators_1 = require("../utils/validators");
const createInventoryItem = async (req, res, next) => {
    try {
        const validation = (0, validators_1.validateInventoryInput)(req.body);
        if (!validation.valid) {
            res.status(400).json({ success: false, error: validation.message });
            return;
        }
        const item = await (0, inventoryService_1.createItem)(req.body);
        res.status(201).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
};
exports.createInventoryItem = createInventoryItem;
const listInventoryItems = async (req, res, next) => {
    try {
        const { page, limit, productName, supplier, location, includeDeleted } = req.query;
        const result = await (0, inventoryService_1.listItems)({
            productName: productName,
            supplier: supplier,
            location: location,
            includeDeleted: includeDeleted === 'true',
        }, {
            page: page ? parseInt(page, 10) : undefined,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
        res.status(200).json({
            success: true,
            data: result.items,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.listInventoryItems = listInventoryItems;
const getInventoryItem = async (req, res, next) => {
    try {
        const item = await (0, inventoryService_1.getItemById)(req.params.id);
        res.status(200).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
};
exports.getInventoryItem = getInventoryItem;
const updateInventoryItem = async (req, res, next) => {
    try {
        const item = await (0, inventoryService_1.updateItem)(req.params.id, req.body);
        res.status(200).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
};
exports.updateInventoryItem = updateInventoryItem;
const deleteInventoryItem = async (req, res, next) => {
    try {
        await (0, inventoryService_1.deleteItem)(req.params.id);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteInventoryItem = deleteInventoryItem;
const adjustInventoryQuantity = async (req, res, next) => {
    try {
        const { delta } = req.body;
        if (typeof delta !== 'number') {
            res.status(400).json({ success: false, error: 'delta must be a number' });
            return;
        }
        const item = await (0, inventoryService_1.adjustQuantity)(req.params.id, delta);
        res.status(200).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
};
exports.adjustInventoryQuantity = adjustInventoryQuantity;
const getLowStockInventoryItems = async (req, res, next) => {
    try {
        const { threshold } = req.query;
        const numericThreshold = threshold ? Number(threshold) : undefined;
        const items = await (0, inventoryService_1.getLowStockItems)(numericThreshold);
        res.status(200).json({ success: true, data: items });
    }
    catch (error) {
        next(error);
    }
};
exports.getLowStockInventoryItems = getLowStockInventoryItems;
const getInventorySummaryHandler = async (req, res, next) => {
    try {
        const threshold = req.query.threshold ? Number(req.query.threshold) : undefined;
        const summary = await (0, inventoryService_1.getInventorySummary)(threshold);
        res.json({ success: true, data: summary });
    }
    catch (err) {
        next(err);
    }
};
exports.getInventorySummaryHandler = getInventorySummaryHandler;
const getInventoryStatsHandler = async (_req, res, next) => {
    try {
        const stats = await (0, inventoryService_1.getInventoryStats)();
        res.json({ success: true, data: stats });
    }
    catch (err) {
        next(err);
    }
};
exports.getInventoryStatsHandler = getInventoryStatsHandler;
const getTopInventoryHandler = async (req, res, next) => {
    try {
        const limit = req.query.limit ? Number(req.query.limit) : 10;
        const items = await (0, inventoryService_1.getTopInventory)(limit);
        res.json({ success: true, data: items });
    }
    catch (err) {
        next(err);
    }
};
exports.getTopInventoryHandler = getTopInventoryHandler;
const getItemLogsHandler = async (req, res, next) => {
    try {
        const { id } = req.params;
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 20;
        const result = await (0, inventoryService_1.getLogsForItem)(id, page, limit);
        res.status(200).json({
            success: true,
            data: result.logs,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getItemLogsHandler = getItemLogsHandler;
const restoreItem = async (req, res, next) => {
    try {
        const item = await (0, inventoryService_1.restoreItem)(req.params.id);
        res.status(200).json({ success: true, data: item });
    }
    catch (error) {
        next(error);
    }
};
exports.restoreItem = restoreItem;
