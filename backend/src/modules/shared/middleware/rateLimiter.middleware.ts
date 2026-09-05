import rateLimit, { Store, IncrementResponse } from 'express-rate-limit';
import { getRedis } from '../../../lib/redis';

/**
 * Redis-backed store for express-rate-limit using the existing Upstash client.
 * Falls back to in-memory if Redis is unavailable (e.g. local dev without UPSTASH env vars).
 */
class UpstashRateLimitStore implements Store {
  private _windowMs: number;
  private _keyPrefix: string;

  constructor(windowMs: number, keyPrefix = 'rl:') {
    this._windowMs = windowMs;
    this._keyPrefix = keyPrefix;
  }

  private key(key: string) {
    return `${this._keyPrefix}${key}`;
  }

  async increment(key: string): Promise<IncrementResponse> {
    const redis = getRedis();
    if (!redis) {
      // Graceful degradation: allow request (no Redis = no distributed limiting)
      return { totalHits: 1, resetTime: new Date(Date.now() + this._windowMs) };
    }
    const rKey = this.key(key);
    const ttlSeconds = Math.ceil(this._windowMs / 1000);
    // Atomic increment; set expiry only on first hit
    const current = await redis.incr(rKey);
    if (current === 1) {
      await redis.expire(rKey, ttlSeconds);
    }
    const ttl = await redis.ttl(rKey);
    const resetTime = new Date(Date.now() + ttl * 1000);
    return { totalHits: current, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    await redis.decr(this.key(key));
  }

  async resetKey(key: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(this.key(key));
  }
}

// Rate limiter for registration
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { error: 'Too many accounts created from this IP, please try again after an hour' },
    standardHeaders: true,
    legacyHeaders: false,
    store: new UpstashRateLimitStore(60 * 60 * 1000, 'rl:reg:'),
});

// Rate limiter for login
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many login attempts, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
    store: new UpstashRateLimitStore(15 * 60 * 1000, 'rl:login:'),
});

// Rate limiter for OTP send (per IP — additional per-phone limit is in otp.service.ts)
export const otpSendLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: { error: 'Too many OTP requests from this device. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    store: new UpstashRateLimitStore(60 * 60 * 1000, 'rl:otp:'),
});
