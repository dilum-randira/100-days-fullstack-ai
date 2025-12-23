"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = void 0;
const crypto_1 = require("crypto");
const requestIdMiddleware = (req, res, next) => {
    const existingRequestId = req.headers['x-request-id'] || undefined;
    const requestId = existingRequestId || (0, crypto_1.randomUUID)();
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    const existingCorrelationId = req.headers['x-correlation-id'] || undefined;
    const correlationId = existingCorrelationId || requestId;
    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
