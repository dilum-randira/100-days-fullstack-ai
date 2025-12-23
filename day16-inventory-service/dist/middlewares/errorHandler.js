"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, _next) => {
    const requestId = req.requestId;
    let statusCode = 500;
    let message = 'Internal Server Error';
    if (err instanceof Error) {
        statusCode = err.statusCode || 500;
        if (statusCode >= 500) {
            message = 'Internal Server Error';
        }
        else {
            message = err.message;
        }
    }
    logger_1.logger.error('Request error', {
        requestId,
        path: req.path,
        method: req.method,
        statusCode,
        message: err instanceof Error ? err.message : String(err),
    });
    res.status(statusCode).json({
        success: false,
        error: message,
        requestId,
    });
};
exports.errorHandler = errorHandler;
