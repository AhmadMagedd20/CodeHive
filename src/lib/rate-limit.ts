import { env } from "./env";

/**
 * Pluggable rate limiter. The in-memory implementation is fine for a single
 * instance / local dev; PROD TODO (PROJECT.md §7): swap for Redis/Upstash so
 * limits are shared across instances. All auth endpoints go through this.
 */

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

// Named limiter configs: [max requests, window seconds].
const LIMITS = {
  login: [10, 60],
  register: [5, 60],
  forgotPassword: [5, 300],
  resendVerification: [5, 300],
  verifyEmail: [20, 60],
  resetPassword: [10, 300],
} as const;

export type LimiterName = keyof typeof LIMITS;

export function rateLimit(name: LimiterName, identifier: string): RateLimitResult {
  // Allow disabling in the test environment for deterministic tests.
  if (env.NODE_ENV === "test") return { ok: true, remaining: Infinity, retryAfterSeconds: 0 };

  const [max, windowSec] = LIMITS[name];
  const key = `${name}:${identifier}`;
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: max - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= max) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count, retryAfterSeconds: 0 };
}

// Opportunistic cleanup so the map doesn't grow unbounded.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
  }, 60_000).unref?.();
}
