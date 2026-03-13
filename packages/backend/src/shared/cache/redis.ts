import Redis from 'ioredis';
import { env } from '../../config';
import { logger } from '../logger';

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as T;
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds = 300): Promise<void> => {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
};

export const cacheDelete = async (key: string): Promise<void> => {
  await redis.del(key);
};

/**
 * Deletes all keys matching a glob pattern using SCAN (non-blocking).
 * Unlike KEYS, SCAN iterates incrementally and won't block Redis.
 */
export const cacheDeletePattern = async (pattern: string): Promise<void> => {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== '0');
};
