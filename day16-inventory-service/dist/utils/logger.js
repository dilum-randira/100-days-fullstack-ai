"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpLoggerStream = exports.withRequestContext = exports.logger = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const winston_1 = __importDefault(require("winston"));
const logsDir = path_1.default.join(__dirname, '..', '..', 'logs');
if (!fs_1.default.existsSync(logsDir)) {
    fs_1.default.mkdirSync(logsDir, { recursive: true });
}
const nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const logLevel = process.env.LOG_LEVEL || 'info';
const baseFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }));
const consoleFormat = nodeEnv === 'production'
    ? winston_1.default.format.combine(baseFormat, winston_1.default.format.json())
    : winston_1.default.format.combine(baseFormat, winston_1.default.format.colorize(), winston_1.default.format.printf((info) => {
        const { timestamp, level, message, ...meta } = info;
        const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]: ${message}${metaString}`;
    }));
exports.logger = winston_1.default.createLogger({
    level: logLevel,
    format: baseFormat,
    transports: [
        new winston_1.default.transports.Console({ format: consoleFormat }),
    ],
});
const withRequestContext = (requestId, correlationId) => {
    if (!requestId && !correlationId) {
        return exports.logger;
    }
    return exports.logger.child({ requestId, correlationId });
};
exports.withRequestContext = withRequestContext;
// morgan stream
exports.httpLoggerStream = {
    write: (message) => {
        exports.logger.info(message.trim());
    },
};
// Global process-level error handlers
process.on('uncaughtException', (err) => {
    exports.logger.error('uncaughtException', { message: err.message, stack: err.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    exports.logger.error('unhandledRejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
    });
    process.exit(1);
});
