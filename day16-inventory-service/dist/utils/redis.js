"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = void 0;
const logger_1 = require("./logger");
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../config");
const redisUrl = config_1.config.redisUrl;
let client = null;
if (redisUrl) {
    try {
        client = new ioredis_1.default(redisUrl, { lazyConnect: true });
        client.on('error', (err) => {
            logger_1.logger.error('Redis error', { message: err.message });
        });
        client.connect().catch((err) => {
            logger_1.logger.error('Failed to connect to Redis', { message: err.message });
        });
    }
    catch (err) {
        logger_1.logger.error('Redis initialization failed', { message: err.message });
        client = null;
    }
}
else {
    logger_1.logger.info('REDIS_URL not set, Redis caching disabled');
}
exports.redisClient = client;
