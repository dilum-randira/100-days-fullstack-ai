import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { logger } from './utils/logger';
import { config } from './config';

export interface RealtimeEventPayload<T = unknown> {
  event: string;
  entityId: string;
  data: T;
  timestamp: string;
  requestId?: string;
}

export interface AuthenticatedUser {
  userId: string;
  role: 'admin' | 'staff' | 'viewer' | string;
  [key: string]: unknown;
}

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*', // tighten in prod if needed
    },
  });

  // Attach Redis adapter when Redis URL is configured to allow scaling across instances
  if (config.redisUrl) {
    try {
      const pubClient = new Redis(config.redisUrl);
      const subClient = pubClient.duplicate();
      // No await here - adapter will work as clients become ready
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('socket.redis_adapter.attached');

      pubClient.on('error', (err: Error) => logger.error('socket.redis.pub_error', { message: err.message }));
      subClient.on('error', (err: Error) => logger.error('socket.redis.sub_error', { message: err.message }));
    } catch (err: any) {
      logger.error('socket.redis_adapter.failed', { message: err.message });
    }
  } else {
    logger.info('socket.redis_adapter.not_configured');
  }

  // Handshake middleware for JWT authentication
  io.use((socket: Socket, next) => {
    try {
      const authToken =
        (socket.handshake.auth && (socket.handshake.auth as any).token) ||
        (socket.handshake.headers && (socket.handshake.headers.authorization as string)?.split(' ')[1]);

      if (!authToken) {
        logger.warn('socket.auth.missing_token', { socketId: socket.id });
        const err = new Error('Authentication error: token required');
        // @ts-ignore - socket.io typings accept Error to signal rejection
        return next(err);
      }

      const decoded = jwt.verify(authToken, config.jwt.accessSecret) as any;

      // minimal user object
      const user: AuthenticatedUser = {
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
      } catch (joinErr: any) {
        logger.warn('socket.join_room_failed', { socketId: socket.id, message: joinErr.message });
      }

      return next();
    } catch (err: any) {
      logger.warn('socket.auth.failed', { socketId: socket.id, message: err.message });
      // @ts-ignore
      return next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const request = socket.request as any;
    const requestId: string | undefined = request?.requestId;
    const user = socket.data.user as AuthenticatedUser | undefined;

    logger.info('socket.connected', {
      socketId: socket.id,
      requestId,
      userId: user?.userId,
      role: user?.role,
    });

    socket.on('disconnect', (reason) => {
      logger.info('socket.disconnected', {
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

export const getIo = (): SocketIOServer | null => io;

/**
 * Emit realtime events with role-based filtering for sensitive updates.
 * - inventory:update -> only admin/staff
 * - inventory:summary -> viewers (and above)
 * - other events -> broadcast to all
 */
export const emitRealtimeEvent = <T>(
  event: string,
  entityId: string,
  data: T,
  requestId?: string,
): void => {
  if (!io) {
    return;
  }

  const payload: RealtimeEventPayload<T> = {
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
    } else if (event === 'inventory:summary' || event === 'analytics:summary') {
      // Viewers (and above) should receive summaries. Emit to viewer room and admin/staff as well.
      io.to('role:viewer').emit(event, payload);
      io.to('role:staff').emit(event, payload);
      io.to('role:admin').emit(event, payload);
    } else {
      // fallback broadcast
      io.emit(event, payload);
    }

    logger.info('socket.event.emitted', { event, entityId, requestId });
  } catch (err: any) {
    logger.error('socket.event.emit_error', { event, entityId, message: err.message });
  }
};
