import { afterEach, describe, expect, test } from 'bun:test'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { GET as cleanupGet, HEAD as cleanupHead, POST as cleanupPost } from '@/app/api/notifications/cleanup/route'
import { hasCronBearer } from '@/lib/cron-auth'
import { config, proxy } from '@/proxy'
import { apiTier, clientIp, rateLimit } from '@/lib/rate-limit'
import { isSameOriginMutation } from '@/lib/request-origin'

const environment = {
  APP_ENV: process.env.APP_ENV,
  CRON_SECRET: process.env.CRON_SECRET,
  VERCEL: process.env.VERCEL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  TRUST_CADDY_PROXY: process.env.TRUST_CADDY_PROXY,
}

afterEach(() => {
  for (const [name, value] of Object.entries(environment)) {
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

function browserRequest(headers: Record<string, string>) {
  return new NextRequest('https://portal.example/api/notes', { method: 'POST', headers })
}

describe('same-origin API writes', () => {
  test('accepts the portal Origin and standard browser fallbacks', () => {
    expect(isSameOriginMutation(browserRequest({ origin: 'https://portal.example' }))).toBe(true)
    expect(isSameOriginMutation(browserRequest({ referer: 'https://portal.example/portal' }))).toBe(true)
    expect(isSameOriginMutation(browserRequest({ 'sec-fetch-site': 'same-origin' }))).toBe(true)
  })

  test('rejects foreign origins, missing browser provenance and same-site siblings', () => {
    expect(isSameOriginMutation(browserRequest({}))).toBe(false)
    expect(isSameOriginMutation(browserRequest({ origin: 'null' }))).toBe(false)
    expect(isSameOriginMutation(browserRequest({ origin: 'https://elsewhere.example' }))).toBe(false)
    expect(isSameOriginMutation(browserRequest({ 'sec-fetch-site': 'same-site' }))).toBe(false)
  })

  test('builds the target origin from Vercel ingress metadata', () => {
    process.env.VERCEL = '1'
    const request = new NextRequest('http://127.0.0.1:3000/api/notes', {
      method: 'POST',
      headers: {
        origin: 'https://portal.example',
        'x-forwarded-host': 'portal.example',
        'x-forwarded-proto': 'https',
      },
    })
    expect(isSameOriginMutation(request)).toBe(true)
  })

  test('denies browser preflight without allowing cross-origin reads', async () => {
    const request = new NextRequest('https://portal.example/api/notes', {
      method: 'OPTIONS',
      headers: { origin: 'https://elsewhere.example', 'access-control-request-method': 'POST' },
    })
    const response = await proxy(request)
    expect(response.status).toBe(403)
    expect(response.headers.has('access-control-allow-origin')).toBe(false)
    expect(response.headers.has('access-control-allow-credentials')).toBe(false)
  })
})

describe('notification cleanup authorization', () => {
  test('requires the configured cron bearer at the GET boundary', async () => {
    process.env.CRON_SECRET = 'fixture-only'
    expect(hasCronBearer(new Headers({ authorization: 'Bearer fixture-only' }))).toBe(true)
    const request = new NextRequest('https://portal.example/api/notifications/cleanup')
    expect((await cleanupGet(request)).status).toBe(401)
    expect(cleanupHead().status).toBe(405)
  })

  test('requires browser provenance for manual cleanup', async () => {
    const request = new NextRequest('https://portal.example/api/notifications/cleanup', { method: 'POST' })
    expect((await cleanupPost(request)).status).toBe(403)
  })
})

describe('request rate limits', () => {
  test('uses trusted ingress addresses and ignores untrusted or invalid forwarding metadata', () => {
    delete process.env.VERCEL
    delete process.env.TRUST_CADDY_PROXY
    const request = browserRequest({
      'x-forwarded-for': '2001:0db8::0001',
      'x-aics-client-ip': '192.0.2.10',
    })
    expect(clientIp(request)).toBe('unknown-ip')

    process.env.TRUST_CADDY_PROXY = '1'
    expect(clientIp(request)).toBe('192.0.2.10')

    process.env.VERCEL = '1'
    expect(clientIp(request)).toBe('2001:db8::1')
    expect(clientIp(browserRequest({ 'x-forwarded-for': '192.0.2.10, 192.0.2.11' }))).toBe('unknown-ip')
  })

  test('has separate budgets for login, scheduled cleanup and health', () => {
    expect(apiTier('/api/auth/login', 'POST')).toBe('auth')
    expect(apiTier('/api/notifications/cleanup', 'GET')).toBe('cron')
    expect(apiTier('/api', 'GET')).toBe('health')
    expect(apiTier('/api/notes', 'GET')).toBe('read')
    expect(apiTier('/api/notes', 'POST')).toBe('write')
  })

  test('includes document and API paths while skipping build output and production assets', () => {
    const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url })
    expect(matches('/')).toBe(true)
    expect(matches('/api')).toBe(true)
    expect(matches('/portal')).toBe(true)
    expect(matches('/legal/privacy')).toBe(true)
    expect(matches('/verify-email')).toBe(true)
    expect(matches('/_next/static/chunks/app.js')).toBe(false)
    expect(matches('/assets/student-id/id-front-template.png')).toBe(false)
  })

  test('counts local development requests and rejects requests over the limit', async () => {
    delete process.env.VERCEL
    delete process.env.VERCEL_ENV
    delete process.env.APP_ENV
    const key = 'unit-test:local-window'
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(true)
    expect((await rateLimit(key, 2, 60_000)).ok).toBe(true)
    const limited = await rateLimit(key, 2, 60_000)
    expect(limited.ok).toBe(false)
    expect(limited.retryAfterSec).toBeGreaterThan(0)
  })
})
