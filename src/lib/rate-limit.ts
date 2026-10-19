// In-memory fixed-window rate limiter (BUG-013, generalized 2026-10-16).
//
// Two layers use this module, with distinct key namespaces:
//   1. Route-level failure throttles — login and change-password count
//      FAILED verifications only, keyed `login:`/`cpw:` + ip + username.
//      The precision anti-brute-force instrument (unchanged behavior).
//   2. Proxy-level request tiers — src/proxy.ts counts every
//      /api request against a per-identity budget keyed `mw:` + tier +
//      identity. The flood ceiling: hammering dies in the proxy before
//      any route work or Mongo round-trip happens.
//
// Identity for tier buckets: the session username when the token
// signature verifies, else the client IP. Campus NAT puts many students
// behind one public IP, so authenticated limits must key by user, never
// by IP, or a morning login rush would lock the whole lab out.
//
// No Redis in stack; per-instance only. Fine for single-node, revisit
// before scaling out (docs/rate-limiting.md).

import type { NextRequest } from 'next/server'

type Key = string
type Entry = { count: number; resetAt: number }

const store = new Map<Key, Entry>()

// Amortized eviction: expired buckets are swept periodically so a
// long-lived instance cannot grow the Map without bound (e.g. scanner
// IPs creating one bucket each).
const SWEEP_EVERY = 1_024
let checks = 0

function sweep(now: number) {
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key)
  }
}

export function rateLimit(key: Key, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  checks += 1
  if (checks % SWEEP_EVERY === 0) sweep(now)
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

// ---------------------------------------------------------------------------
// General API request tiers (enforced in src/proxy.ts).
//
// Budgets are 5-minute fixed windows sized with >=10x headroom over
// observed legitimate traffic: a portal load bursts ~15 GETs (prefetch
// included), the client polls nothing, and sustained grade encoding
// peaks around 2-3 saves per minute. Tighter limits protect nothing
// extra and risk locking out real users; looser ones stop being a
// ceiling.
// ---------------------------------------------------------------------------

export type TierName = 'auth' | 'read' | 'write'

export const RATE_TIERS: Record<TierName, { limit: number; windowMs: number }> = {
  // Unauthenticated entry points (login, demo), keyed by IP: 100 per
  // 5 min survives a campus-NAT morning rush (dozens of students, one
  // IP) while capping credential sprays; per-username precision stays
  // in the route-level failure throttle.
  auth: { limit: 100, windowMs: 5 * 60_000 },
  // Authenticated GET/HEAD, keyed by username: 1 req/sec sustained.
  read: { limit: 300, windowMs: 5 * 60_000 },
  // Authenticated POST/PATCH/PUT/DELETE, keyed by username: 24/min
  // sustained — roughly 10x human click speed while encoding grades.
  write: { limit: 120, windowMs: 5 * 60_000 },
}

// First hop of x-forwarded-for (the client as seen by the platform),
// matching the pre-existing login-route parsing.
export function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
}

// Tier selection for a /api request. Login and demo are the
// unauthenticated entry points -> strict auth tier. Everything else
// keys off the HTTP method: reads get the generous budget, mutations
// the tighter one. The /api health stub never reaches this (the proxy
// returns early); /api/auth/session is a plain read.
export function apiTier(pathname: string, method: string): TierName {
  if (pathname === '/api/auth/login' || pathname === '/api/auth/demo') return 'auth'
  const m = method.toUpperCase()
  if (m === 'GET' || m === 'HEAD') return 'read'
  return 'write'
}

// One-call tier check for the proxy. `identity` is the verified session
// username when present, else the client IP (resolved by the caller —
// the proxy holds the token claims).
export function checkApiRateLimit(
  pathname: string,
  method: string,
  identity: string
): { ok: boolean; retryAfterSec: number; tier: TierName } {
  const tier = apiTier(pathname, method)
  const { ok, retryAfterSec } = rateLimit(
    `mw:${tier}:${identity}`,
    RATE_TIERS[tier].limit,
    RATE_TIERS[tier].windowMs
  )
  return { ok, retryAfterSec, tier }
}
