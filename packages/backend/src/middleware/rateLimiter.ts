import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../shared/cache/redis';
import { env } from '../config';
import { logger } from '../shared/logger';

const createRedisStore = (prefix: string) => {
  try {
    return new RedisStore({
      sendCommand: (...args: string[]) =>
        redis.call(args[0] as string, ...args.slice(1)) as Promise<any>,
      prefix: `rl:${prefix}:`,
    });
  } catch (err) {
    logger.warn(
      { err },
      `Failed to create Redis rate-limit store for "${prefix}", falling back to memory`,
    );
    return undefined;
  }
};

const rateLimitMessage = (message: string) => ({
  success: false,
  error: {
    code: 'TOO_MANY_REQUESTS',
    message,
  },
});

/** General API rate limiter — configurable via env */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  message: rateLimitMessage('Too many requests, please try again later'),
});

/** Strict limiter for auth endpoints (login, register, password reset) */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: rateLimitMessage('Too many authentication attempts, please try again later'),
});

/** GraphQL endpoint limiter */
export const graphqlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('gql'),
  message: rateLimitMessage('Too many GraphQL requests, please try again later'),
});
