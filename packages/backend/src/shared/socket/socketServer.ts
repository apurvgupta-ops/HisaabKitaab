import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config';
import { logger } from '../logger';

let io: Server;

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const initSocketServer = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: {
      origin: env.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, env.jwt.secret) as { sub: string };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    socket.join(`user:${userId}`);

    socket.on('join_group', (groupId: string) => {
      socket.join(`group:${groupId}`);
      logger.debug({ userId, groupId }, 'Joined group room');
    });

    socket.on('leave_group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      logger.debug({ userId, groupId }, 'Left group room');
    });

    socket.on('disconnect', () => {
      logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
    });
  });

  logger.info('Socket.io server initialized');
  return io;
};

export const emitToGroup = (groupId: string, event: string, data: unknown): void => {
  getIO().to(`group:${groupId}`).emit(event, data);
};

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  getIO().to(`user:${userId}`).emit(event, data);
};
