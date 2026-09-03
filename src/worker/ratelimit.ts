import type { D1Database } from '@cloudflare/workers-types';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Extracts client IP safely from Cloudflare request headers
 */
export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0].trim();
    if (first) return first;
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) return realIp.trim();

  return '127.0.0.1';
}

/**
 * Atomic sliding window rate limiter backed by D1
 */
export async function checkRateLimit(
  db: D1Database,
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);

  // Fetch current rate limit row
  const row = await db
    .prepare('SELECT count, reset_at FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ count: number; reset_at: number }>();

  if (!row || row.reset_at <= now) {
    // Window expired or new key: insert or replace fresh window
    const newResetAt = now + windowSeconds;
    await db
      .prepare(
        'INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at'
      )
      .bind(key, newResetAt)
      .run();

    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetInSeconds: windowSeconds
    };
  }

  // Active window
  const resetIn = Math.max(1, row.reset_at - now);

  if (row.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: resetIn
    };
  }

  // Increment count
  await db
    .prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
    .bind(key)
    .run();

  return {
    allowed: true,
    remaining: Math.max(0, maxRequests - (row.count + 1)),
    resetInSeconds: resetIn
  };
}

/**
 * Periodically cleans up expired rate limits in the background
 */
export async function cleanupExpiredRateLimits(db: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await db.prepare('DELETE FROM rate_limits WHERE reset_at < ?').bind(now).run();
}
