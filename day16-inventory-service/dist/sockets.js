"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitRealtimeEvent = exports.getIo = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_adapter_1 = require("@socket.io/redis-adapter");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("./utils/logger");
const config_1 = require("./config");
let io = null;
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: '*', // tighten in prod if needed
        },
    });
    // Attach Redis adapter when Redis URL is configured to allow scaling across instances
    if (config_1.config.redisUrl) {
        try {
            const pubClient = new ioredis_1.default(config_1.config.redisUrl);
            const subClient = pubClient.duplicate();
            // No await here - adapter will work as clients become ready
            io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            logger_1.logger.info('socket.redis_adapter.attached');
            pubClient.on('error', (err) => logger_1.logger.error('socket.redis.pub_error', { message: err.message }));
            subClient.on('error', (err) => logger_1.logger.error('socket.redis.sub_error', { message: err.message }));
        }
        catch (err) {
            logger_1.logger.error('socket.redis_adapter.failed', { message: err.message });
        }
    }
    else {
        logger_1.logger.info('socket.redis_adapter.not_configured');
    }
    // Handshake middleware for JWT authentication
    io.use((socket, next) => {
        try {
            const authToken = (socket.handshake.auth && socket.handshake.auth.token) ||
                (socket.handshake.headers && socket.handshake.headers.authorization?.split(' ')[1]);
            if (!authToken) {
                logger_1.logger.warn('socket.auth.missing_token', { socketId: socket.id });
                const err = new Error('Authentication error: token required');
                // @ts-ignore - socket.io typings accept Error to signal rejection
                return next(err);
            }
            const decoded = jsonwebtoken_1.default.verify(authToken, config_1.config.jwt.accessSecret);
            // minimal user object
            const user = {
                userId: decoded.sub || decoded.userId || decoded.id,
                role: decoded.role || 'viewer',
                ...decoded,
            };
            socket.data.user = user;
            // Join role room for efficient targeted emissions
            try {
                if (user.role) {
                    socket.join(`role:${user.role}`);
                }
                // also join personal room
                if (user.userId) {
                    socket.join(`user:${user.userId}`);
                }
            }
            catch (joinErr) {
                logger_1.logger.warn('socket.join_room_failed', { socketId: socket.id, message: joinErr.message });
            }
            return next();
        }
        catch (err) {
            logger_1.logger.warn('socket.auth.failed', { socketId: socket.id, message: err.message });
            // @ts-ignore
            return next(new Error('Authentication error'));
        }
    });
    io.on('connection', (socket) => {
        const request = socket.request;
        const requestId = request?.requestId;
        const user = socket.data.user;
        logger_1.logger.info('socket.connected', {
            socketId: socket.id,
            requestId,
            userId: user?.userId,
            role: user?.role,
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('socket.disconnected', {
                socketId: socket.id,
                reason,
                requestId,
                userId: user?.userId,
                role: user?.role,
            });
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIo = () => io;
exports.getIo = getIo;
/**
 * Emit realtime events with role-based filtering for sensitive updates.
 * - inventory:update -> only admin/staff
 * - inventory:summary -> viewers (and above)
 * - other events -> broadcast to all
 */
const emitRealtimeEvent = (event, entityId, data, requestId) => {
    if (!io) {
        return;
    }
    const payload = {
        event,
        entityId,
        data,
        timestamp: new Date().toISOString(),
        requestId,
    };
    try {
        if (event === 'inventory:update') {
            // Only admin and staff
            io.to('role:admin').emit(event, payload);
            io.to('role:staff').emit(event, payload);
        }
        else if (event === 'inventory:summary' || event === 'analytics:summary') {
            // Viewers (and above) should receive summaries. Emit to viewer room and admin/staff as well.
            io.to('role:viewer').emit(event, payload);
            io.to('role:staff').emit(event, payload);
            io.to('role:admin').emit(event, payload);
        }
        else {
            // fallback broadcast
            io.emit(event, payload);
        }
        logger_1.logger.info('socket.event.emitted', { event, entityId, requestId });
    }
    catch (err) {
        logger_1.logger.error('socket.event.emit_error', { event, entityId, message: err.message });
    }
};
exports.emitRealtimeEvent = emitRealtimeEvent;
