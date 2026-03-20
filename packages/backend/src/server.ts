import * as Sentry from '@sentry/node';
import http from 'http';
import app from './app';
import { env } from './config';
import { logger } from './shared/logger';
import { prisma } from './shared/database/prisma';
import { redis } from './shared/cache/redis';
import { initSocketServer } from './shared/socket/socketServer';
import { setupGraphQL } from './graphql';

if (env.sentryDsn) {
  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    tracesSampleRate: env.isProd() ? 0.2 : 1.0,
    beforeSend(event) {
      if (env.isDev()) {
        logger.debug({ event: event.event_id }, 'Sentry event captured (dev)');
      }
      return event;
    },
  });
  logger.info('Sentry initialized');
}

const server = http.createServer(app);

initSocketServer(server);

const start = async () => {
  try {
    await prisma.$connect();
    logger.info('Database connected');

    if (redis.status === 'wait') {
      await redis.connect();
    }
    logger.info('Redis connected');

    await setupGraphQL(app);

    server.listen(env.port, () => {
      logger.info(`Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    Sentry.captureException(err);
    await Sentry.flush(2000);
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down...');
  server.close();
  await prisma.$disconnect();
  redis.disconnect();
  await Sentry.flush(2000);
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  Sentry.captureException(reason);
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  Sentry.captureException(err);
  Sentry.flush(2000).then(() => process.exit(1));
});

start();
