/**
 * A fixed-window counter, per key, in memory.
 *
 * This is a brake, not a meter. On a serverless host each instance keeps its
 * own counts and loses them when it is recycled, so a determined caller gets
 * more than the limit says. It stops one tab in a loop and casual abuse; the
 * real ceiling on spend is the caps on what one request can ask for, and a
 * rate limit rule at the host's edge (see RELEASING.md).
 */
export interface RateLimiter {
  /** Counts one request. False when the key has used up its window. */
  take: (
    key: string,
    now?: number,
  ) => { allowed: true } | { allowed: false; retryAfter: number };
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const windows = new Map<string, { started: number; count: number }>();

  return {
    take(key, now = Date.now()) {
      const current = windows.get(key);
      if (!current || now - current.started >= windowMs) {
        // Forget finished windows here, so the map cannot grow without bound.
        for (const [other, entry] of windows) {
          if (now - entry.started >= windowMs) windows.delete(other);
        }
        windows.set(key, { started: now, count: 1 });
        return { allowed: true };
      }
      if (current.count >= limit) {
        return {
          allowed: false,
          retryAfter: Math.ceil((current.started + windowMs - now) / 1000),
        };
      }
      current.count += 1;
      return { allowed: true };
    },
  };
}
