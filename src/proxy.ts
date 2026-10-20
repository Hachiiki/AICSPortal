// Phase 6: server-side session enforcement (fixes BUG-004/005/009).
//
// 2026-10-20 — migrated from the deprecated `middleware` file
// convention to `proxy` (Next.js 16): same file location, same
// matcher, same runtime; only the entry point's name changed
// (middleware → proxy). Behavior is byte-equivalent — see
// https://nextjs.org/docs/messages/middleware-to-proxy.
//
// - Every /api route except the auth entry points requires a valid
//   session cookie, else 401 JSON. Routes then derive identity from
//   getSession(request) — caller-supplied username/performedBy is
//   never trusted (spoof attempts get 403 in the route).
// - Every /portal page requires a valid session cookie, else the
//   browser is bounced to / (which renders the login view).
//
// 2026-10-16 — general API rate limiting: every /api request passes a
// tiered fixed-window budget BEFORE the session gate (src/lib/rate-limit.ts,
// docs/rate-limiting.md). Authenticated requests bucket by session
// username (campus NAT: many students, one IP), unauthenticated by
// client IP. Login and change-password keep their route-level failure
// throttles underneath — the proxy counts attempts, routes count
// failures, so neither can be evaded by the other being wrong.

import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'
import { checkApiRateLimit, clientIp } from '@/lib/rate-limit'

const PUBLIC_API = new Set([
  '/api/auth/login',
  '/api/auth/demo',
  '/api/auth/session',
])

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    // Health stub stays public (and unlimited — it touches nothing).
    if (pathname === '/api') return NextResponse.next()

    // Rate limit ahead of the session gate so floods die before any
    // route work runs. Identity = verified session username when
    // present, else client IP. One token verification serves both the
    // bucket key and the auth gate below.
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value || '')
    const identity = session?.username ?? clientIp(request)
    const limited = checkApiRateLimit(pathname, request.method, identity)
    if (!limited.ok) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests. Please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      )
    }

    if (PUBLIC_API.has(pathname)) return NextResponse.next()
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/portal')) {
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value || '')
    if (!session) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/portal/:path*'],
}
