import type { NextRequest } from 'next/server'

function requestOrigin(request: NextRequest): string {
  const onVercel = process.env.VERCEL === '1'
  const behindCaddy = process.env.TRUST_CADDY_PROXY === '1'
  const host = (onVercel ? request.headers.get('x-forwarded-host') : null)
    ?? request.headers.get('host')
  if (!host) return request.nextUrl.origin

  const forwardedProtocol = onVercel || behindCaddy ? request.headers.get('x-forwarded-proto') : null
  const protocol = forwardedProtocol === 'https' || forwardedProtocol === 'http'
    ? `${forwardedProtocol}:`
    : request.nextUrl.protocol
  try {
    const target = new URL(`${protocol}//${host}`)
    if (target.username || target.password || target.pathname !== '/' || target.search || target.hash) return ''
    return target.origin
  } catch {
    return ''
  }
}

export function isSameOriginMutation(request: NextRequest): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin') return false

  const target = requestOrigin(request)
  if (!target) return false

  const origin = request.headers.get('origin')
  if (origin !== null) return origin === target

  const referer = request.headers.get('referer')
  if (referer !== null) {
    try {
      return new URL(referer).origin === target
    } catch {
      return false
    }
  }
  return fetchSite === 'same-origin'
}
