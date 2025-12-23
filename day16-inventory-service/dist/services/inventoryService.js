"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendingItems = exports.getTopItems = exports.getInventorySummary = exports.getLowStockItems = exports.emitQcStatusEvent = exports.emitBatchUpdateEvent = exports.publishBatchQCPassedEvent = exports.publishBatchConsumedEvent = exports.withInventoryTransaction = exports.adjustQuantity = exports.listItems = exports.restoreItem = exports.deleteItem = exports.updateItem = exports.getItemById = exports.createItem = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const InventoryItem_1 = require("../models/InventoryItem");
const mongoose_2 = require("mongoose");
const InventoryLog_1 = require("../models/InventoryLog");
const redis_1 = require("../utils/redis");
const logger_1 = require("../utils/logger");
const inventoryQueue_1 = require("../queues/inventoryQueue");
const sockets_1 = require("../sockets");
const EventBus_1 = require("../events/EventBus");
const analyticsClient_1 = require("./analyticsClient");
const CACHE_TTL_SECONDS = 60;
const ANALYTICS_CACHE_TTL_SECONDS = 60;
const buildCacheKey = (endpoint, params) => {
    const base = `inventory:${endpoint}`;
    if (!params || Object.keys(params).length === 0)
        return base;
    const sorted = {};
    for (const key of Object.keys(params).sort()) {
        sorted[key] = params[key];
    }
    return `${base}:${JSON.stringify(sorted)}`;
};
const safeGetCache = async (key) => {
    if (!redis_1.redisClient)
        return null;
    try {
        const raw = await redis_1.redisClient.get(key);
        if (!raw) {
            logger_1.logger.debug?.('cache.miss', { key });
            return null;
        }
        logger_1.logger.debug?.('cache.hit', { key });
        return JSON.parse(raw);
    }
    catch (err) {
        logger_1.logger.error('cache.get.error', { key, message: err.message });
        return null;
    }
};
const safeSetCache = async (key, value) => {
    if (!redis_1.redisClient)
        return;
    try {
        await redis_1.redisClient.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
    }
    catch (err) {
        logger_1.logger.error('cache.set.error', { key, message: err.message });
    }
};
const cacheSet = async (key, value) => {
    if (!redis_1.redisClient)
        return;
    try {
        await redis_1.redisClient.set(key, JSON.stringify(value), 'EX', ANALYTICS_CACHE_TTL_SECONDS);
    }
    catch (err) {
        // best-effort cache
    }
};
const cacheGet = async (key) => {
    if (!redis_1.redisClient)
        return null;
    try {
        const raw = await redis_1.redisClient.get(key);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
};
const clearInventoryCache = async () => {
    if (!redis_1.redisClient)
        return;
    try {
        const keys = await redis_1.redisClient.keys('inventory:*');
        if (keys.length > 0) {
            await redis_1.redisClient.del(keys);
            logger_1.logger.info('cache.clear.inventory', { count: keys.length });
        }
    }
    catch (err) {
        logger_1.logger.error('cache.clear.error', { message: err.message });
    }
};
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const createItem = async (data) => {
    const item = new InventoryItem_1.InventoryItem(data);
    await item.save();
    await clearInventoryCache();
    return item;
};
exports.createItem = createItem;
const getItemById = async (id) => {
    if (!(0, mongoose_2.isValidObjectId)(id)) {
        throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
    }
    const item = await InventoryItem_1.InventoryItem.findOne({ _id: id, isDeleted: { $ne: true } }).exec();
    if (!item) {
        throw Object.assign(new Error('Item not found'), { statusCode: 404 });
    }
    return item;
};
exports.getItemById = getItemById;
const updateItem = async (id, updates) => {
    if (!(0, mongoose_2.isValidObjectId)(id)) {
        throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
    }
    const item = await InventoryItem_1.InventoryItem.findByIdAndUpdate(id, { $set: updates }, {
        new: true,
        runValidators: true,
    }).exec();
    if (!item) {
        throw Object.assign(new Error('Item not found'), { statusCode: 404 });
    }
    await clearInventoryCache();
    return item;
};
exports.updateItem = updateItem;
const deleteItem = async (id) => {
    if (!(0, mongoose_2.isValidObjectId)(id)) {
        throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
    }
    const result = await InventoryItem_1.InventoryItem.findOneAndUpdate({ _id: id, isDeleted: { $ne: true } }, { $set: { isDeleted: true, deletedAt: new Date() } }, { new: true }).exec();
    if (!result) {
        throw Object.assign(new Error('Item not found'), { statusCode: 404 });
    }
    await clearInventoryCache();
};
exports.deleteItem = deleteItem;
const restoreItem = async (id) => {
    if (!(0, mongoose_2.isValidObjectId)(id)) {
        throw Object.assign(new Error('Invalid item ID'), { statusCode: 400 });
    }
    const item = await InventoryItem_1.InventoryItem.findOneAndUpdate({ _id: id, isDeleted: true }, { $set: { isDeleted: false, deletedAt: null } }, { new: true }).exec();
    if (!item) {
        throw Object.assign(new Error('Item not found'), { statusCode: 404 });
    }
    await clearInventoryCache();
    return item;
};
exports.restoreItem = restoreItem;
const listItems = async (filter, pagination) => {
    const page = pagination.page && pagination.page > 0 ? pagination.page : DEFAULT_PAGE;
    const limit = pagination.limit && pagination.limit > 0 ? pagination.limit : DEFAULT_LIMIT;
    const skip = (page - 1) * limit;
    const query = {};
    if (!filter.includeDeleted) {
        query.isDeleted = { $ne: true };
    }
    if (filter.productName) {
        query.productName = { $regex: filter.productName, $options: 'i' };
    }
    if (filter.supplier) {
        query.supplier = { $regex: filter.supplier, $options: 'i' };
    }
    if (filter.location) {
        query.location = { $regex: filter.location, $options: 'i' };
    }
    const [items, total] = await Promise.all([
        InventoryItem_1.InventoryItem.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
        InventoryItem_1.InventoryItem.countDocuments(query).exec(),
    ]);
    return { items, total, page, limit };
};
exports.listItems = listItems;
const adjustQuantity = async (id, delta) => {
    if (!Number.isInteger(delta)) {
        throw Object.assign(new Error('Delta must be an integer'), { statusCode: 400 });
    }
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    logger_1.logger.info('transaction.start', { operation: 'adjustQuantity', itemId: id });
    try {
        const item = await InventoryItem_1.InventoryItem.findById(id).session(session).exec();
        if (!item) {
            throw Object.assign(new Error('Item not found'), { statusCode: 404 });
        }
        const oldQuantity = item.quantity;
        const newQuantity = oldQuantity + delta;
        if (newQuantity < 0) {
            throw Object.assign(new Error('Quantity cannot be negative'), { statusCode: 400 });
        }
        item.quantity = newQuantity;
        await item.save({ session });
        await InventoryLog_1.InventoryLog.create([
            {
                itemId: item._id,
                delta,
                oldQuantity,
                newQuantity,
            },
        ], { session });
        await session.commitTransaction();
        logger_1.logger.info('transaction.commit', { operation: 'adjustQuantity', itemId: String(item._id) });
        // Non-transactional side effects
        await clearInventoryCache();
        await (0, inventoryQueue_1.enqueueInventoryJobs)([
            { name: 'recalculate-analytics', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
            { name: 'send-low-stock-alerts', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
            { name: 'archive-old-logs', data: { itemId: String(item._id), trigger: 'quantity-adjusted' } },
        ]);
        await EventBus_1.eventBus.publish(EventBus_1.DOMAIN_EVENTS.InventoryAdjusted, {
            itemId: String(item._id),
            oldQuantity,
            newQuantity,
            delta,
        });
        try {
            (0, sockets_1.emitRealtimeEvent)('inventory:update', String(item._id), {
                oldQuantity,
                newQuantity,
                delta,
            });
        }
        catch (err) {
            logger_1.logger.error('realtime.inventory_update.error', {
                itemId: String(item._id),
                message: err.message,
            });
        }
        return item;
    }
    catch (error) {
        await session.abortTransaction();
        logger_1.logger.error('transaction.abort', { operation: 'adjustQuantity', itemId: id, message: error.message });
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.adjustQuantity = adjustQuantity;
// Helper to run arbitrary operations inside a transaction for batch/QC flows
const withInventoryTransaction = async (operation, fn) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    logger_1.logger.info('transaction.start', { operation });
    try {
        const result = await fn(session);
        await session.commitTransaction();
        logger_1.logger.info('transaction.commit', { operation });
        return result;
    }
    catch (error) {
        await session.abortTransaction();
        logger_1.logger.error('transaction.abort', { operation, message: error.message });
        throw error;
    }
    finally {
        session.endSession();
    }
};
exports.withInventoryTransaction = withInventoryTransaction;
const publishBatchConsumedEvent = async (batchId, payload) => {
    await EventBus_1.eventBus.publish(EventBus_1.DOMAIN_EVENTS.BatchConsumed, {
        batchId,
        ...payload,
    });
};
exports.publishBatchConsumedEvent = publishBatchConsumedEvent;
const publishBatchQCPassedEvent = async (batchId, payload) => {
    await EventBus_1.eventBus.publish(EventBus_1.DOMAIN_EVENTS.BatchQCPassed, {
        batchId,
        ...payload,
    });
};
exports.publishBatchQCPassedEvent = publishBatchQCPassedEvent;
const emitBatchUpdateEvent = (batchId, data) => {
    try {
        (0, sockets_1.emitRealtimeEvent)('batch:update', batchId, data);
    }
    catch (err) {
        logger_1.logger.error('realtime.batch_update.error', { batchId, message: err.message });
    }
};
exports.emitBatchUpdateEvent = emitBatchUpdateEvent;
const emitQcStatusEvent = (batchId, data) => {
    try {
        (0, sockets_1.emitRealtimeEvent)('qc:status', batchId, data);
    }
    catch (err) {
        logger_1.logger.error('realtime.qc_status.error', { batchId, message: err.message });
    }
};
exports.emitQcStatusEvent = emitQcStatusEvent;
const getLowStockItems = async (threshold) => {
    if (threshold !== undefined && threshold < 0) {
        throw Object.assign(new Error('Threshold cannot be negative'), { statusCode: 400 });
    }
    if (threshold !== undefined) {
        return InventoryItem_1.InventoryItem.find({ quantity: { $lt: threshold } }).exec();
    }
    return InventoryItem_1.InventoryItem.find({ $expr: { $lt: ['$quantity', '$minThreshold'] } }).exec();
};
exports.getLowStockItems = getLowStockItems;
const getInventorySummary = async () => {
    const cacheKey = 'analytics:inventory:summary';
    const cached = await cacheGet(cacheKey);
    if (cached)
        return cached;
    const summary = await (0, analyticsClient_1.fetchInventorySummary)();
    await cacheSet(cacheKey, summary);
    return summary;
};
exports.getInventorySummary = getInventorySummary;
const getTopItems = async () => {
    const cacheKey = 'analytics:inventory:top-items';
    const cached = await cacheGet(cacheKey);
    if (cached)
        return cached;
    const topItems = await (0, analyticsClient_1.fetchTopItems)();
    await cacheSet(cacheKey, topItems);
    return topItems;
};
exports.getTopItems = getTopItems;
const getTrendingItems = async () => {
    const cacheKey = 'analytics:inventory:trending-items';
    const cached = await cacheGet(cacheKey);
    if (cached)
        return cached;
    const trendingItems = await (0, analyticsClient_1.fetchTrendingItems)();
    await cacheSet(cacheKey, trendingItems);
    return trendingItems;
};
exports.getTrendingItems = getTrendingItems;
