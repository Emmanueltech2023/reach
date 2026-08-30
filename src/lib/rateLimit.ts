// ─── API Rate Limiting & Abuse Protection Module ────────────────────────────────────
// In-memory sliding window rate limiter for Next.js API routes & endpoints.

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const trackerMap = new Map<string, RateLimitRecord>();

/**
 * Checks and enforces sliding-window rate limits per client IP / identifier.
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 30,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const record = trackerMap.get(identifier);

  // Periodic cleanup of expired records (keep memory footprint low)
  if (trackerMap.size > 5000) {
    for (const [key, entry] of trackerMap.entries()) {
      if (entry.resetAt < now) {
        trackerMap.delete(key);
      }
    }
  }

  if (!record || record.resetAt < now) {
    trackerMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      success: true,
      remaining: limit - 1,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      reset: Math.ceil((record.resetAt - now) / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: limit - record.count,
    reset: Math.ceil((record.resetAt - now) / 1000),
  };
}
