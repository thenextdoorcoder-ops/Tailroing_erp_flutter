import { getRedis } from '../../../lib/redis';

type CacheOptions = {
    ttl?: number; // seconds
};

export const cacheService = {
    /**
     * Get a value from cache. Returns null if not found.
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const redis = getRedis();
            if (!redis) return null;
            const val = await redis.get<T>(key);
            if (val === null || val === undefined) return null;
            return typeof val === 'string' ? JSON.parse(val) as T : val;
        } catch {
            return null;
        }
    },

    /**
     * Set a value in cache with optional TTL in seconds.
     */
    async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
        try {
            const redis = getRedis();
            if (!redis) return;
            const serialized = JSON.stringify(value);
            if (options.ttl) {
                await redis.set(key, serialized, { ex: options.ttl });
            } else {
                await redis.set(key, serialized);
            }
        } catch (err) {
            console.warn('[Cache] Set failed:', err);
        }
    },

    /**
     * Delete one or more cache keys.
     */
    async del(...keys: string[]): Promise<void> {
        try {
            const redis = getRedis();
            if (!redis) return;
            if (keys.length > 0) await redis.del(...keys);
        } catch (err) {
            console.warn('[Cache] Del failed:', err);
        }
    },

    /**
     * Delete all keys matching a pattern (use sparingly).
     */
    async invalidatePattern(pattern: string): Promise<void> {
        try {
            const redis = getRedis();
            if (!redis) return;
            const keys = await redis.keys(pattern);
            if (keys && keys.length > 0) await redis.del(...keys);
        } catch (err) {
            console.warn('[Cache] InvalidatePattern failed:', err);
        }
    },

    /**
     * Increment a counter with optional TTL (for rate limiting).
     */
    async incr(key: string, ttlSeconds?: number): Promise<number> {
        const redis = getRedis();
        if (!redis) return 0;
        const count = await redis.incr(key);
        if (count === 1 && ttlSeconds) {
            await redis.expire(key, ttlSeconds);
        }
        return count;
    },
};
