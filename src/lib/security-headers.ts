import { randomBytes } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'

export function continueWithSecurityHeaders(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
    return response
  }

  const development = process.env.NODE_ENV === 'development'
  const nonce = randomBytes(16).toString('base64')
  const scriptSrc = development ? "'self' 'unsafe-inline' 'unsafe-eval'" : `'nonce-${nonce}' 'strict-dynamic'`
  const policy = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    `connect-src 'self' https://api.cloudinary.com https://vitals.vercel-insights.com https://va.vercel-scripts.com${development ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ')

  const headers = new Headers(request.headers)
  headers.set('x-csp-nonce', nonce)
  headers.set('Content-Security-Policy', policy)
  const response = NextResponse.next({ request: { headers } })
  response.headers.set('Content-Security-Policy', policy)
  response.headers.set('Cache-Control', 'private, no-store')
  return response
}
