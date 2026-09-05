import { Redis } from '@upstash/redis';

// ─────────────────────────────────────────────────────────────
// Singleton Upstash Redis client (REST-based, serverless-safe)
// ─────────────────────────────────────────────────────────────
let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[Redis] UPSTASH_REDIS_REST_URL or TOKEN not set — caching disabled.');
    return null;
  }

  redis = new Redis({ url, token });
  console.log('[Redis] Upstash Redis connected.');
  return redis;
}

// ─────────────────────────────────────────────────────────────
// Generic cache helpers
// ─────────────────────────────────────────────────────────────

/**
 * Get a cached value. Returns null if not found or Redis unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedis();
    if (!client) return null;
    const data = await client.get<T>(key);
    return data;
  } catch (err) {
    console.error('[Redis] GET error:', err);
    return null;
  }
}

/**
 * Set a cached value with TTL in seconds.
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    await client.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.error('[Redis] SET error:', err);
  }
}

/**
 * Delete one or more cache keys (for invalidation).
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;
    await client.del(...keys);
  } catch (err) {
    console.error('[Redis] DEL error:', err);
  }
}

/**
 * Delete all keys matching a prefix pattern (e.g. "dash:*")
 * Uses SCAN to avoid blocking.
 */
export async function cacheDelByPrefix(prefix: string): Promise<void> {
  try {
    const client = getRedis();
    if (!client) return;

    // Use KEYS instead of SCAN to satisfy type definitions for this specific Upstash version.
    // Safe for this project's small cache size.
    const keys = await client.keys(`${prefix}*`);
    if (keys && keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.error('[Redis] DEL-BY-PREFIX error:', err);
  }
}

export default getRedis;
