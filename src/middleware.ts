// Phase 6: server-side session enforcement (fixes BUG-004/005/009).
//
// - Every /api route except the auth entry points requires a valid
//   session cookie, else 401 JSON. Routes then derive identity from
//   getSession(request) — caller-supplied username/performedBy is
//   never trusted (spoof attempts get 403 in the route).
// - Every /portal page requires a valid session cookie, else the
//   browser is bounced to / (which renders the login view).

import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

const PUBLIC_API = new Set([
  '/api/auth/login',
  '/api/auth/demo',
  '/api/auth/session',
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    // Health stub stays public.
    if (pathname === '/api' || PUBLIC_API.has(pathname)) return NextResponse.next()
    const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value || '')
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
