// In-memory fixed-window rate limiter for auth routes (BUG-013).
// No Redis in stack; per-instance only. Fine for single-node, revisit before scaling out.

type Key = string
type Entry = { count: number; resetAt: number }

const store = new Map<Key, Entry>()

export function rateLimit(key: Key, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  const existing = store.get(key)
  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  existing.count += 1
  if (existing.count > limit) {
    return { ok: false, retryAfterSec: Math.ceil((existing.resetAt - now) / 1000) }
  }
  return { ok: true, retryAfterSec: 0 }
}

// Test-only hook: clear the in-memory store between probes.
export function __clearRateLimitStore() {
  store.clear()
}
