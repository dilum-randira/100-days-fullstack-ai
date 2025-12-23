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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const http_1 = __importDefault(require("http"));
const app_1 = __importStar(require("./app"));
const db_1 = require("./db");
const inventoryQueue_1 = require("./queues/inventoryQueue");
const logger_1 = require("./utils/logger");
const redis_1 = require("./utils/redis");
const config_1 = require("./config");
const sockets_1 = require("./sockets");
const PORT = config_1.config.port;
const NODE_ENV = config_1.config.nodeEnv;
const start = async () => {
    try {
        await (0, db_1.connectDB)();
    }
    catch (err) {
        logger_1.logger.error('server.start.db_error', { message: err.message });
        process.exit(1);
    }
    try {
        await inventoryQueue_1.inventoryQueueScheduler.waitUntilReady();
        logger_1.logger.info('inventory.queue.scheduler.ready');
    }
    catch (err) {
        logger_1.logger.error('inventory.queue.scheduler.error', { message: err.message });
    }
    inventoryQueue_1.inventoryWorker.on('ready', () => {
        logger_1.logger.info('inventory.worker.ready');
    });
    inventoryQueue_1.inventoryWorker.on('error', (err) => {
        logger_1.logger.error('inventory.worker.error', { message: err.message });
    });
    const server = http_1.default.createServer(app_1.default);
    // Track open connections to avoid request loss during shutdown.
    const connections = new Set();
    server.on('connection', (socket) => {
        connections.add(socket);
        socket.on('close', () => connections.delete(socket));
    });
    try {
        (0, sockets_1.initSocket)(server);
        logger_1.logger.info('socket.io.initialized');
    }
    catch (err) {
        logger_1.logger.error('socket.io.init_error', { message: err.message });
    }
    server.listen(PORT, '0.0.0.0', () => {
        logger_1.logger.info('server.started', { env: NODE_ENV, port: PORT });
        console.log(`Day 16 Inventory Service running on http://0.0.0.0:${PORT}`);
    });
    let shuttingDown = false;
    const shutdown = async (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        logger_1.logger.info('server.shutdown.initiated', { signal });
        // Immediately fail readiness so Kubernetes stops routing traffic to this pod.
        (0, app_1.markShuttingDown)();
        // Stop accepting new connections.
        server.close((err) => {
            if (err) {
                logger_1.logger.error('server.shutdown.http_error', { message: err.message });
            }
            else {
                logger_1.logger.info('server.shutdown.http_closed');
            }
        });
        // Allow in-flight requests to complete. After timeout, force-close remaining sockets.
        const drainTimeoutMs = Number(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS || 25000);
        const t = setTimeout(() => {
            logger_1.logger.warn('server.shutdown.force_close_connections', { openConnections: connections.size });
            for (const socket of connections) {
                socket.destroy();
            }
        }, drainTimeoutMs);
        t.unref?.();
        try {
            await (0, db_1.closeDB)();
        }
        catch (err) {
            logger_1.logger.error('server.shutdown.db_error', { message: err.message });
        }
        try {
            await inventoryQueue_1.inventoryWorker.close();
            await inventoryQueue_1.inventoryQueueScheduler.close();
            logger_1.logger.info('server.shutdown.queue_closed');
        }
        catch (err) {
            logger_1.logger.error('server.shutdown.queue_error', { message: err.message });
        }
        try {
            if (redis_1.redisClient) {
                await redis_1.redisClient.quit();
                logger_1.logger.info('server.shutdown.redis_closed');
            }
        }
        catch (err) {
            logger_1.logger.error('server.shutdown.redis_error', { message: err.message });
        }
        // Allow logs to flush.
        const done = setTimeout(() => process.exit(0), 250);
        done.unref?.();
    };
    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
};
start().catch((err) => {
    logger_1.logger.error('server.start.failed', { message: err instanceof Error ? err.message : String(err) });
    process.exit(1);
});
