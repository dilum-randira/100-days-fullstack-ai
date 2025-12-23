"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTopItems = exports.fetchTrendingItems = exports.fetchInventorySummary = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const ANALYTICS_TIMEOUT_MS = 2000;
const ANALYTICS_RETRY_COUNT = 2;
const createClient = () => {
    const baseURL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:5000/api/analytics';
    return axios_1.default.create({
        baseURL,
        timeout: ANALYTICS_TIMEOUT_MS,
    });
};
const client = createClient();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function withRetry(fn, retries = ANALYTICS_RETRY_COUNT) {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            logger_1.logger.warn('analytics.client.request_failed', {
                attempt,
                message: err?.message,
            });
            if (attempt < retries) {
                await sleep(100 * (attempt + 1));
            }
        }
    }
    throw lastError;
}
const fetchInventorySummary = async (context) => {
    try {
        const response = await withRetry(() => client.get('/inventory/summary', {
            headers: {
                'x-request-id': context?.requestId,
                'x-correlation-id': context?.correlationId,
            },
        }));
        return response.data;
    }
    catch (err) {
        logger_1.logger.error('analytics.client.summary.failed', { message: err?.message });
        return null;
    }
};
exports.fetchInventorySummary = fetchInventorySummary;
const fetchTrendingItems = async (limit = 10, context) => {
    try {
        const response = await withRetry(() => client.get(`/inventory/trending?limit=${limit}`, {
            headers: {
                'x-request-id': context?.requestId,
                'x-correlation-id': context?.correlationId,
            },
        }));
        return response.data;
    }
    catch (err) {
        logger_1.logger.error('analytics.client.trending.failed', { message: err?.message });
        return null;
    }
};
exports.fetchTrendingItems = fetchTrendingItems;
const fetchTopItems = async (limit = 10, context) => {
    try {
        const response = await withRetry(() => client.get(`/inventory/top?limit=${limit}`, {
            headers: {
                'x-request-id': context?.requestId,
                'x-correlation-id': context?.correlationId,
            },
        }));
        return response.data;
    }
    catch (err) {
        logger_1.logger.error('analytics.client.top.failed', { message: err?.message });
        return null;
    }
};
exports.fetchTopItems = fetchTopItems;
