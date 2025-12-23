"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDB = exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;
const connectDB = async () => {
    const uri = config_1.config.mongoUri;
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            attempt += 1;
            const conn = await mongoose_1.default.connect(uri);
            logger_1.logger.info('MongoDB connected', {
                host: conn.connection.host,
                name: conn.connection.name,
            });
            return;
        }
        catch (error) {
            logger_1.logger.error('MongoDB connection error', {
                attempt,
                message: error.message,
            });
            if (attempt >= MAX_RETRIES) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
    }
};
exports.connectDB = connectDB;
const closeDB = async () => {
    if (mongoose_1.default.connection.readyState !== 0) {
        await mongoose_1.default.connection.close();
        logger_1.logger.info('MongoDB connection closed gracefully');
    }
};
exports.closeDB = closeDB;
