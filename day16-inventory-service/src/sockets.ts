import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from './utils/logger';

export interface RealtimeEventPayload<T = unknown> {
  event: string;
  entityId: string;
  data: T;
  timestamp: string;
  requestId?: string;
}

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket: Socket) => {
    const request = socket.request as any;
    const requestId: string | undefined = request?.requestId;

    logger.info('socket.connected', {
      socketId: socket.id,
      requestId,
    });

    socket.on('disconnect', (reason) => {
      logger.info('socket.disconnected', {
        socketId: socket.id,
        reason,
        requestId,
      });
    });
  });

  return io;
};

export const getIo = (): SocketIOServer | null => io;

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
    io.emit(event, payload);
    logger.info('socket.event.emitted', { event, entityId, requestId });
  } catch (err: any) {
    logger.error('socket.event.emit_error', { event, entityId, message: err.message });
  }
};
