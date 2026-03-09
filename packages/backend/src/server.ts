import http from 'http';
import app from './app';
import { env } from './config';
import { logger } from './shared/logger';
import { prisma } from './shared/database/prisma';
import { redis } from './shared/cache/redis';
import { initSocketServer } from './shared/socket/socketServer';
import { setupGraphQL } from './graphql';

const server = http.createServer(app);

initSocketServer(server);

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    await redis.connect();
    logger.info('Redis connected');

    await setupGraphQL(app);

    server.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down...');
  server.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});

start();
