import { prisma } from '../../shared/database/prisma';
import { cacheGet, cacheSet, cacheDelete } from '../../shared/cache/redis';

const FEATURE_FLAG_CACHE_TTL = 60;
const CACHE_KEY_PREFIX = 'feature_flag:';
const CACHE_KEY_ALL = 'feature_flags:all';

/**
 * Deterministic hash for userId + key to support percentage rollout.
 * Returns a number 0–99 for consistent bucket assignment.
 */
function rolloutBucket(userId: string, key: string): number {
  let hash = 0;
  const str = `${userId}:${key}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100;
}

/**
 * Evaluates whether a feature flag is enabled for a given user.
 * Logic: targetUserIds > rolloutPercent > enabled.
 */
export async function isFeatureEnabled(key: string, userId?: string): Promise<boolean> {
  const cacheKey = `${CACHE_KEY_PREFIX}${key}`;
  const cached = await cacheGet<{
    enabled: boolean;
    rolloutPercent: number;
    targetUserIds: string[];
  }>(cacheKey);

  let flag: {
    enabled: boolean;
    rolloutPercent: number;
    targetUserIds: string[];
  };

  if (cached) {
    flag = cached;
  } else {
    const row = await prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true, rolloutPercent: true, targetUserIds: true },
    });

    if (!row) {
      return false;
    }

    const targetUserIds = Array.isArray(row.targetUserIds) ? (row.targetUserIds as string[]) : [];

    flag = {
      enabled: row.enabled,
      rolloutPercent: row.rolloutPercent,
      targetUserIds,
    };

    await cacheSet(cacheKey, flag, FEATURE_FLAG_CACHE_TTL);
  }

  if (!flag.enabled) return false;

  if (flag.targetUserIds.length > 0) {
    return userId ? flag.targetUserIds.includes(userId) : false;
  }

  if (flag.rolloutPercent < 100 && userId) {
    return rolloutBucket(userId, key) < flag.rolloutPercent;
  }

  return flag.rolloutPercent >= 100;
}

/**
 * Returns all evaluated feature flags for the current user as a flat map.
 * Caches the raw flag list; evaluation is done per-flag.
 */
export async function getFeatureFlagsForUser(userId?: string): Promise<Record<string, boolean>> {
  const cached =
    await cacheGet<
      { key: string; enabled: boolean; rolloutPercent: number; targetUserIds: string[] }[]
    >(CACHE_KEY_ALL);

  let flags: {
    key: string;
    enabled: boolean;
    rolloutPercent: number;
    targetUserIds: string[];
  }[];

  if (cached) {
    flags = cached;
  } else {
    const rows = await prisma.featureFlag.findMany({
      select: { key: true, enabled: true, rolloutPercent: true, targetUserIds: true },
    });

    flags = rows.map((r) => ({
      key: r.key,
      enabled: r.enabled,
      rolloutPercent: r.rolloutPercent,
      targetUserIds: Array.isArray(r.targetUserIds) ? (r.targetUserIds as string[]) : [],
    }));

    await cacheSet(CACHE_KEY_ALL, flags, FEATURE_FLAG_CACHE_TTL);
  }

  const result: Record<string, boolean> = {};

  for (const flag of flags) {
    if (!flag.enabled) {
      result[flag.key] = false;
      continue;
    }

    if (flag.targetUserIds.length > 0) {
      result[flag.key] = userId ? flag.targetUserIds.includes(userId) : false;
      continue;
    }

    if (flag.rolloutPercent < 100 && userId) {
      result[flag.key] = rolloutBucket(userId, flag.key) < flag.rolloutPercent;
    } else {
      result[flag.key] = flag.rolloutPercent >= 100;
    }
  }

  return result;
}

/**
 * Invalidates cache for a specific flag or all flags. Call after updating flags.
 */
export async function invalidateFeatureFlagCache(key?: string): Promise<void> {
  if (key) {
    await cacheDelete(`${CACHE_KEY_PREFIX}${key}`);
  }
  await cacheDelete(CACHE_KEY_ALL);
}
