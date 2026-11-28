import { NextRequest, NextResponse } from 'next/server'
import { hasCronBearer } from '@/lib/cron-auth'
import { apiTier, checkRequestRateLimit, clientIp, CRON_CLEANUP_PATH } from '@/lib/rate-limit'
import { isSameOriginMutation } from '@/lib/request-origin'
import { continueWithSecurityHeaders } from '@/lib/security-headers'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session'

const PUBLIC_API = new Set([
  '/api',
  '/api/auth/login',
  '/api/auth/demo',
  '/api/auth/session',
])

function rejectRequest(api: boolean, status: number, error: string, retryAfter?: number) {
  const headers = new Headers({ 'Cache-Control': 'no-store' })
  if (retryAfter !== undefined) headers.set('Retry-After', String(retryAfter))
  if (api) {
    headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    return NextResponse.json({ ok: false, error }, { status, headers })
  }
  headers.set('Content-Type', 'text/plain; charset=utf-8')
  return new NextResponse(error, { status, headers })
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { method } = request
  const api = pathname === '/api' || pathname.startsWith('/api/')
  const portal = pathname === '/portal' || pathname.startsWith('/portal/')
  const cleanupGet = pathname === CRON_CLEANUP_PATH && method === 'GET'
  const cron = cleanupGet && hasCronBearer(request.headers)

  if (api && method !== 'GET' && method !== 'HEAD' && !isSameOriginMutation(request)) {
    return rejectRequest(true, 403, 'This request must come from the portal.')
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const session = token ? await verifySessionToken(token) : null
  const tier = api ? apiTier(pathname, method) : 'page'
  let identity = `ip:${clientIp(request)}`
  if (cron) identity = 'service:notification-cleanup'
  else if (session && tier !== 'auth' && tier !== 'health') identity = `account:${session.username}`

  try {
    const limited = await checkRequestRateLimit(tier, identity)
    if (!limited.ok) {
      return rejectRequest(api, 429, 'Too many requests. Please wait a moment and try again.', limited.retryAfterSec)
    }
  } catch {
    console.error('Request rate-limit store unavailable.')
    return rejectRequest(api, 503, 'The request service is temporarily unavailable. Please try again.', 5)
  }

  if (api && (cleanupGet ? !cron : !session && !PUBLIC_API.has(pathname))) {
    return rejectRequest(true, 401, 'Unauthorized')
  }
  if (portal && !session) return NextResponse.redirect(new URL('/', request.url))

  const response = continueWithSecurityHeaders(request)
  if (api) response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return response
}

export const config = {
  // Skip immutable Next build output and the known static public files.
  matcher: ['/((?!_next/static(?:/|$)|aics-logo\\.svg$|aics-campus\\.jpg$|robots\\.txt$|assets/student-id/(?:id-front-template\\.png|photo-placeholder\\.svg)$).*)'],
}
