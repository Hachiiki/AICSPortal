# General API Rate Limiting: Decision Record

Status: **live on main** (PR #47, 2026-10-16). Closes the Infrastructure TODO
item "Rate limiting, login + change-password have in-memory fixed-window
throttles (BUG-013); no general API rate limiting."

## 1. Why

Before PR #47 the portal had exactly two throttles: failed logins and failed
password changes (BUG-013). Every other /api surface was unlimited, which
meant:

- **Scanner floods** could hammer every endpoint (401s are cheap to answer,
  but each one still burns a Mongo round-trip in the session revocation
  check).
- **Credential sprays** rotating usernames were only constrained per
  username (10 fails / 15 min); the per-IP dimension had no ceiling at all.
- **Hot endpoints** (e.g. /api/admin/stats aggregates every collection
  across all branches) could be hammer-looped by a single authenticated
  session.
- **Broken or malicious clients** (retry storms, tight fetch loops) had no
  backstop.

The route-level throttles stay untouched; PR #47 adds the missing general
ceiling.

## 2. The two layers (defense in depth)

| layer | counts | key namespace | fires where |
| --- | --- | --- | --- |
| middleware tier (**new**) | every attempt | `mw:<tier>:<identity>` | 429 + Retry-After, before any route work or Mongo round-trip |
| route throttle (existing) | failures only | `login:`/`cpw:` + ip + username | 429 on the 11th failed verification per 15 min |

Middleware counts attempts; routes count failures. A successful login never
counts against the route throttle, an IP rotating usernames is still capped
by the middleware auth tier, and neither can be evaded by the other being
wrong.

## 3. Tiers (5-minute fixed windows)

| tier | budget | keyed by | covers | rationale |
| --- | --- | --- | --- | --- |
| auth | 100 / 5 min | client IP | POST /api/auth/login, /api/auth/demo | survives a campus-NAT morning rush (dozens of students, one IP) while capping sprays; per-username precision stays in the route throttle |
| read | 300 / 5 min | session username | GET/HEAD on every other /api route | 1 req/sec sustained. 20x headroom over a portal-load burst |
| write | 120 / 5 min | session username | POST/PATCH/PUT/DELETE | 24/min sustained, roughly 10x human click speed while encoding grades |

Sizing evidence: a portal load bursts ~15 GETs (History and task-group
prefetch included), the client polls nothing (the only timer in the app is
the Face ID mock scan animation, which is purely client-side), sustained
grade encoding peaks at 2-3 saves per minute, and every bulk surface
(announcement fan-out, bulk delete, task fan-out) is a single request.

## 4. Keying: why username, not IP

Campus NAT puts an entire computer lab behind one public IP. IP-keyed
authenticated limits would let one heavy user starve every classmate behind
the same router, or let a morning login rush lock the whole lab out. So
the middleware resolves identity from the **verified session token**
(signature check only, no DB hit) and keys the bucket by username, falling
back to client IP only when no valid signature exists (login, demo, or
cookie-less requests). Forged cookies cannot gain extra buckets: an invalid
signature yields no username, so the attacker stays on the single IP bucket.

## 5. Deliberately NOT limited

- **GET /api** (health stub): touches nothing; unlimited by design.
- **/portal pages**: server-rendered HTML with no side effects; the
  middleware matcher still guards them with the session redirect.
- **Successful logins**: the route throttle counts failures only.

## 6. The 429 contract

```
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds until the window resets, 1..300>
{"ok":false,"error":"Too many requests. Please wait a moment and try again."}
```

Same JSON shape as every other error in the API layer; `Retry-After`
matches the pre-existing convention from the BUG-013 throttles.

## 7. Memory bounds

The store is a plain `Map`. Every 1,024 checks an amortized sweep deletes
expired buckets, so a long-lived instance cannot grow the Map without bound
(scanner IPs creating one bucket each). Bucket count is bounded by distinct
identities (accounts + observed IPs).

## 8. Verification: 21/21 (`scripts/verify-rate-limit.sh`)

One invocation boots a throwaway mongod + seed + `next start`, then runs
each family from its own forged `x-forwarded-for` source IP / identity so
buckets collide only where the test wants them to:

- **Sanity (5)**: health stub stays unlimited (5x 200); real login succeeds
  and sets the cookie; authed GET 200; /api/auth/session 200; faculty 403 on
  the admin-only announcements write.
- **Auth tier (2)**: rotating usernames from one IP, exactly 100x 401 then
  429x 5; the 429 carries the JSON error and a numeric Retry-After within
  the 5-min window.
- **Defense in depth (1)**: 10 failed logins for one username pass (401),
  the 11th returns 429 with the **route** message ("Too many login
  attempts"), proving the route throttle still fires under the middleware.
- **Read tier (5)**: exactly 300x 200 then 429x 5 for one username; other
  users still 200 (isolation); admin stats still 200; /portal page renders
  200 with an exhausted API bucket; cookie-less portal still redirects 307.
- **Write tier (2)**: exactly 120x 403 then 429x 5 (admin-only route, valid
  body, role gate intact); another user's write still processed (400 zod).
- **Unauthenticated (1)**: 300x 401 then 429x 5, IP-keyed.
- **Persistence (1)**: announcements and notifications counts unchanged:
  the floods wrote nothing.

## 9. Limitations and future work

- **Per-instance store (the known BUG-013 caveat, now covering more).** No
  Redis in the stack; each server/middleware instance keeps its own buckets.
  On Vercel that means per-region/per-instance ceilings (effective limit =
  budget x instances). Acceptable for the current single-node scale; when
  scaling out, replace the `Map` in `rateLimit()` with a TTL store
  (Redis / Upstash). It is a single seam that both layers call.
- **No per-route overrides yet.** Tiers are uniform (auth/read/write).
  If a specific route ever needs its own budget (e.g. a cheaper or costlier
  endpoint), `apiTier()` in `src/lib/rate-limit.ts` is the single seam.
- **No X-RateLimit-* response headers.** Clients get Retry-After on 429
  only; informational headers can be added at the middleware call site if a
  client ever needs live budget visibility.
- **Windows are fixed, not sliding.** A burst straddling a window boundary
  can briefly exceed the nominal rate (2x worst case). Fine at these
  budgets; a sliding window/leaky bucket is the upgrade path if ever
  needed.

## 10. Change record

- 2026-10-16. PR #47: `src/lib/rate-limit.ts` (RATE_TIERS, clientIp,
  apiTier, checkApiRateLimit, sweep) + `src/proxy.ts` (tier budget
  ahead of the session gate). Verified 21/21 by
  `scripts/verify-rate-limit.sh`.
