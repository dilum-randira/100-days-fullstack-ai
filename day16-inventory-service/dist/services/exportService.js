"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportBatches = exports.exportLogs = exports.exportInventory = void 0;
const InventoryItem_1 = require("../models/InventoryItem");
const InventoryLog_1 = require("../models/InventoryLog");
const logger_1 = require("../utils/logger");
const getFormat = (req) => {
    const format = req.query.format?.toLowerCase();
    return format === 'csv' ? 'csv' : 'json';
};
const isAdmin = (req) => {
    const role = req.user?.role || req.headers['x-user-role'];
    return role === 'admin';
};
const logAudit = (req, resource, format) => {
    const userId = req.user?.id || req.headers['x-user-id'];
    const requestId = req.requestId || req.headers['x-request-id'];
    const correlationId = req.correlationId || req.headers['x-correlation-id'];
    logger_1.logger.info('audit.export', {
        resource,
        format,
        userId,
        requestId,
        correlationId,
    });
};
const setDownloadHeaders = (res, name, format) => {
    const ext = format === 'csv' ? 'csv' : 'json';
    res.setHeader('Content-Disposition', `attachment; filename="${name}.${ext}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8');
};
const writeCsvRow = (res, fields) => {
    const escaped = fields.map((field) => {
        if (field === null || field === undefined)
            return '';
        const str = String(field);
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    });
    res.write(escaped.join(',') + '\n');
};
const exportInventory = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return;
        }
        const format = getFormat(req);
        logAudit(req, 'inventory', format);
        setDownloadHeaders(res, 'inventory', format);
        const cursor = InventoryItem_1.InventoryItem.find({}).cursor();
        if (format === 'csv') {
            writeCsvRow(res, ['_id', 'productName', 'sku', 'quantity', 'unit', 'location', 'supplier', 'status', 'minThreshold', 'createdAt', 'updatedAt']);
            for await (const doc of cursor) {
                writeCsvRow(res, [
                    doc._id.toString(),
                    doc.productName,
                    doc.sku,
                    doc.quantity,
                    doc.unit,
                    doc.location,
                    doc.supplier,
                    doc.status,
                    doc.minThreshold,
                    doc.createdAt?.toISOString(),
                    doc.updatedAt?.toISOString(),
                ]);
            }
            res.end();
            return;
        }
        // JSON streaming as NDJSON for large datasets
        res.write('[');
        let first = true;
        for await (const doc of cursor) {
            const plain = doc.toJSON();
            if (!first) {
                res.write(',');
            }
            else {
                first = false;
            }
            res.write(JSON.stringify(plain));
        }
        res.write(']');
        res.end();
    }
    catch (error) {
        next(error);
    }
};
exports.exportInventory = exportInventory;
const exportLogs = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return;
        }
        const format = getFormat(req);
        logAudit(req, 'logs', format);
        setDownloadHeaders(res, 'logs', format);
        const cursor = InventoryLog_1.InventoryLog.find({}).cursor();
        if (format === 'csv') {
            writeCsvRow(res, ['_id', 'itemId', 'delta', 'oldQuantity', 'newQuantity', 'createdAt']);
            for await (const doc of cursor) {
                writeCsvRow(res, [
                    doc._id.toString(),
                    doc.itemId.toString(),
                    doc.delta,
                    doc.oldQuantity,
                    doc.newQuantity,
                    doc.createdAt?.toISOString(),
                ]);
            }
            res.end();
            return;
        }
        res.write('[');
        let first = true;
        for await (const doc of cursor) {
            const plain = doc.toJSON();
            if (!first) {
                res.write(',');
            }
            else {
                first = false;
            }
            res.write(JSON.stringify(plain));
        }
        res.write(']');
        res.end();
    }
    catch (error) {
        next(error);
    }
};
exports.exportLogs = exportLogs;
const exportBatches = async (req, res, next) => {
    try {
        if (!isAdmin(req)) {
            res.status(403).json({ success: false, error: 'Forbidden' });
            return;
        }
        const format = getFormat(req);
        logAudit(req, 'batches', format);
        setDownloadHeaders(res, 'batches', format);
        // Placeholder: when Batch model exists, replace this with real streaming query
        res.status(501).json({ success: false, error: 'NotImplemented' });
    }
    catch (error) {
        next(error);
    }
};
exports.exportBatches = exportBatches;
