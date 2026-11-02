import { createServer, IncomingMessage } from 'node:http'
import { randomUUID } from 'node:crypto'
import { ONBOARDING_REGISTRY, emptyValues } from '../../src/lib/onboarding/registry.ts'
import { onboardingPreferences } from '../../src/lib/onboarding/preferences.ts'

const READ_API = new Set(['/api/auth/session', '/api/student', '/api/tasks', '/api/events', '/api/professors', '/api/enrollment', '/api/announcements', '/api/notifications', '/api/materials'])

const SPEC = ONBOARDING_REGISTRY.student
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; worker-src 'none'; form-action 'self'; base-uri 'self'"
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').map(part => { const i = part.indexOf('='); return [part.slice(0, i).trim(), part.slice(i + 1)] }))
const fresh = () => ({ values: emptyValues(SPEC), preferences: onboardingPreferences(null), token: randomUUID() })

async function body(req) {
  let value = ''
  for await (const chunk of req) {
    value += chunk
    if (value.length > 8192) throw new Error('Request too large')
  }
  return value
}

/** One loopback listener. All app handlers, including server actions, stay behind this guard. */
export function createManualPreviewServer({ handleApp, authenticate, onStop, host = 'onboarding.localhost', publicPaths = [] }) {
  const sessions = new Map()
  const assets = new Set(publicPaths)
  const stats = { simulatedWrites: 0, blockedRequests: 0, blockedMutations: 0, forwardedApiReads: 0, loginRequests: 0 }
  const server = createServer(async (req, res) => {
    const writeHead = res.writeHead
    res.writeHead = function (...args) {
      res.setHeader('content-security-policy', CSP)
      res.setHeader('cache-control', 'no-store')
      res.setHeader('x-content-type-options', 'nosniff')
      // The isolated loopback hostname uses HTTP. Production cookie code is unchanged.
      const set = res.getHeader('set-cookie')
      if (set) res.setHeader('set-cookie', (Array.isArray(set) ? set : [set]).map(s => s.replace(/;\s*Secure\b/gi, '').replace(/;\s*Domain=[^;]*/gi, '')))
      return writeHead.apply(this, args)
    }
    const json = (status, data) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)) }
    const deny = () => { stats.blockedRequests++; if (!['GET', 'HEAD'].includes(req.method)) stats.blockedMutations++; json(403, { ok: false, error: 'Account and data changes are blocked in this preview.' }) }
    try {
      const authority = req.headers.host
      if (authority !== `${host}:${server.address().port}` || req.socket.remoteAddress !== '127.0.0.1') return deny()
      const origin = `http://${authority}`, url = new URL(req.url, origin)
      if (url.origin !== origin || /%2f|%5c/i.test(url.pathname)) return deny()
      const path = decodeURIComponent(url.pathname)
      const mutating = !['GET', 'HEAD'].includes(req.method)
      if (mutating && req.headers.origin !== origin) return deny()
      const cookie = cookies(req)
      let id = cookie.aics_preview
      if (!sessions.has(id)) {
        if (sessions.size >= 32) sessions.delete(sessions.keys().next().value)
        id = randomUUID()
        sessions.set(id, fresh())
        res.setHeader('set-cookie', `aics_preview=${id}; HttpOnly; SameSite=Strict; Path=/`)
      }
      const state = sessions.get(id)
      const envelope = () => ({ ok: true, role: 'student', version: SPEC.version, dimensions: SPEC.dimensions, values: state.values, preferences: state.preferences, persisted: true })
      if (path === '/__preview' && req.method === 'GET') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        return res.end(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AICS preview controls</title><body style="font:16px system-ui;max-width:680px;margin:40px auto;padding:16px"><h1>Student onboarding preview</h1><p>Progress lives only in this process. Account edits, uploads and data changes are blocked. Use Stop preview below when you finish.</p><p><a href="/">Open the student portal</a></p><form method="post" action="/__preview/actions"><input type="hidden" name="token" value="${state.token}"><p><button name="action" value="reset">Reset welcome and return to sign-in</button></p><p><button name="action" value="account-steps">Simulate completed password and photo steps</button></p><p><button name="action" value="stop">Stop preview</button></p></form><h2>Current simulated progress</h2><pre>${JSON.stringify({ values: state.values, preferences: state.preferences, stats }, null, 2)}</pre><p>After changing a fixture, reload the student portal to read it. No human accessibility or visual review has been recorded by this tool.</p></body></html>`)
      }
      if (path === '/__preview/status' && req.method === 'GET') return json(200, { simulated: true, ...envelope(), stats })
      if (path === '/__preview/actions' && req.method === 'POST') {
        const form = new URLSearchParams(await body(req))
        if (form.get('token') !== state.token) return deny()
        if (form.get('action') === 'reset') {
          sessions.set(id, fresh())
          res.setHeader('set-cookie', 'aics_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/')
          res.writeHead(303, { location: '/' }); return res.end()
        }
        if (form.get('action') === 'account-steps') {
          state.values.password = state.values.photo = true
          res.writeHead(303, { location: '/portal/commonwealth/student/juan.santos' }); return res.end()
        }
        if (form.get('action') === 'stop') {
          res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Preview stopped. You can close this tab.')
          setTimeout(() => void onStop(), 100); return
        }
        return deny()
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        res.setHeader('set-cookie', 'aics_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/')
        return json(200, { ok: true })
      }
      if (path === '/api/auth/login' && req.method === 'POST') {
        const raw = await body(req), input = JSON.parse(raw)
        if (input.username !== 'juan.santos' || typeof input.password !== 'string' || !input.password || input.password.length > 1024) return deny()
        // Only the already-verified modern-hash synthetic account may log in.
        // Re-create the consumed stream for Next without logging credentials.
        const request = new IncomingMessage(req.socket)
        Object.assign(request, { url: req.url, method: req.method, headers: req.headers, httpVersion: req.httpVersion, complete: true })
        request.push(Buffer.from(raw)); request.push(null)
        stats.loginRequests++
        return await handleApp(request, res)
      }
      if (path === '/api/onboarding/state' && ['GET', 'PATCH'].includes(req.method)) {
        if (!await authenticate(req)) return json(401, { ok: false, error: 'Sign in to the preview first.' })
        if (req.method === 'PATCH') {
          const input = JSON.parse(await body(req))
          const updates = input.updates, prefs = input.preferences ?? {}
          if (!updates || Array.isArray(updates) || typeof updates !== 'object' || !prefs || Array.isArray(prefs) || typeof prefs !== 'object'
            || Object.entries(updates).some(([k, v]) => !SPEC.dimensions.some(d => d.key === k) || typeof v !== 'boolean')
            || Object.entries(prefs).some(([k, v]) => !Object.keys(onboardingPreferences(null)).includes(k) || typeof v !== 'boolean')) return json(400, { ok: false, error: 'Invalid preview progress.' })
          Object.assign(state.values, updates); Object.assign(state.preferences, prefs); stats.simulatedWrites++
        }
        return json(200, envelope())
      }
      if (mutating) return deny()
      if (path.startsWith('/api')) {
        if (!READ_API.has(path) || url.searchParams.getAll('username').some(name => name !== 'juan.santos')) return deny()
        if (path !== '/api/auth/session' && !await authenticate(req)) return json(401, { ok: false, error: 'Unauthorized' })
        stats.forwardedApiReads++
      } else if (path !== '/' && !/^\/portal\/commonwealth\/student\/juan\.santos(?:\/(?:academics|events|professors|enrollment|profile|settings|help))?$/.test(path) && !path.startsWith('/_next/static/') && !assets.has(path)) return deny()
      await handleApp(req, res)
    } catch {
      if (!res.headersSent) json(400, { ok: false, error: 'The local preview could not handle this request.' })
      else res.end()
    }
  })
  server.requestTimeout = 15000
  server.headersTimeout = 10000
  server.previewStats = stats
  return server
}
