import { afterEach, expect, test } from 'bun:test'
import { createManualPreviewServer } from './manual-preview-server.mjs'

const running = []
afterEach(async () => {
  for (const server of running.splice(0)) {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
  }
})

async function preview() {
  const reached = []
  const server = createManualPreviewServer({
    host: 'onboarding.localhost',
    authenticate: async req => req.headers.cookie?.includes('aics_session=test-session'),
    handleApp: async (req, res) => {
      reached.push(req.method + ' ' + req.url)
      res.end('application handler')
    },
    onStop: async () => {},
  })
  running.push(server)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const origin = 'http://onboarding.localhost:' + port
  const request = async (path, init = {}) => fetch('http://127.0.0.1:' + port + path, {
    ...init, redirect: 'manual', headers: { host: 'onboarding.localhost:' + port, origin, cookie: 'aics_session=test-session', ...init.headers },
  })
  return { request, reached }
}

test('password, account, upload and unknown mutations never reach the application', async () => {
  const p = await preview()
  for (const [method, path] of [['POST', '/api/auth/change-password'], ['PATCH', '/api/student/update'], ['POST', '/api/student/photo'], ['DELETE', '/api/tasks'], ['POST', '/api/notifications'], ['POST', '/portal/unknown'], ['POST', '/api/onboarding/state/']]) {
    expect((await p.request(path, { method })).status).toBe(403)
  }
  expect(p.reached).toEqual([])
})

test('simulated progress survives refresh and stays separate for another browser', async () => {
  const p = await preview()
  const first = await p.request('/api/onboarding/state')
  expect(first.status).toBe(200)
  const fixtureCookie = first.headers.getSetCookie()[0].split(';')[0]
  const headers = { cookie: 'aics_session=test-session; ' + fixtureCookie, 'content-type': 'application/json' }
  expect((await p.request('/api/onboarding/state', { method: 'PATCH', headers, body: JSON.stringify({ updates: { tour: true }, preferences: { welcomeSeen: true, checklistDismissed: true } }) })).status).toBe(200)
  const refreshed = await (await p.request('/api/onboarding/state', { headers })).json()
  expect(refreshed).toMatchObject({ values: { tour: true, password: false }, preferences: { welcomeSeen: true, checklistDismissed: true }, persisted: true })
  const another = await (await p.request('/api/onboarding/state')).json()
  expect(another.values.tour).toBe(false)
  expect(p.reached).toEqual([])
})

test('rejects remote hosts, cross-origin writes, other accounts and malformed progress', async () => {
  const p = await preview()
  expect((await p.request('/', { headers: { host: 'example.com' } })).status).toBe(403)
  expect((await p.request('/api/onboarding/state', { method: 'PATCH', headers: { origin: 'http://example.com' }, body: '{}' })).status).toBe(403)
  expect((await p.request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'someone.else', password: 'test-only' }) })).status).toBe(403)
  expect((await p.request('/api/onboarding/state', { method: 'PATCH', body: JSON.stringify({ updates: { username: true } }) })).status).toBe(400)
  expect((await p.request('/api/student?username=someone.else')).status).toBe(403)
  expect((await p.request('/%61pi/notifications/cleanup')).status).toBe(403)
  expect((await p.request('/api/onboarding/state', { headers: { cookie: '' } })).status).toBe(401)
  expect(p.reached).toEqual([])
})

test('reset restores first-time welcome and logout clears only the preview cookie', async () => {
  const p = await preview()
  const controls = await p.request('/__preview')
  const fixtureCookie = controls.headers.getSetCookie()[0].split(';')[0]
  const token = (await controls.text()).match(/name="token" value="([^"]+)"/)[1]
  const headers = { cookie: 'aics_session=test-session; ' + fixtureCookie }
  await p.request('/api/onboarding/state', { method: 'PATCH', headers, body: JSON.stringify({ updates: { tour: true }, preferences: { welcomeSeen: true } }) })
  const reset = await p.request('/__preview/actions', { method: 'POST', headers, body: new URLSearchParams({ token, action: 'reset' }).toString() })
  expect(reset.status).toBe(303)
  expect(reset.headers.get('location')).toBe('/')
  expect(reset.headers.getSetCookie()).toContain('aics_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/')
  const next = await (await p.request('/api/onboarding/state', { headers })).json()
  expect(next).toMatchObject({ values: { tour: false }, preferences: { welcomeSeen: false, checklistDismissed: false } })
  const logout = await p.request('/api/auth/logout', { method: 'POST', headers })
  expect(await logout.json()).toEqual({ ok: true })
  expect(p.reached).toEqual([])
})
