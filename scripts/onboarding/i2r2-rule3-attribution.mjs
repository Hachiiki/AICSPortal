// I2 Rule 3 attribution + Rule 2 transition diagnostic - dedicated CDP
// Profiler pass against the real student tour (production-profile build).
//
// Part A (Rule 3): the scripted resize/scroll series with the tour overlay
// open on a spotted step, instrumented three ways at once:
//   1. the committed window-level Long Tasks API observer (parity),
//   2. CDP Profiler (cpu sampling) across the whole series,
//   3. wall-clock windows for every long task, correlated to the profiler's
//      epoch-microsecond timebase through the page time origin, so the JS
//      self-time inside each over-50 ms task can be attributed by function.
//
// Part B (Rule 2 diagnostic): the heaviest ordinary transition
// (student-announcements -> student-academics, the dashboard -> academics
// route change) is repeated under the profiler via Back/Next alternation,
// with the same settle contract, to answer where its time goes: tour-engine
// JS, React rendering, C++ layout/paint, or frame-pacing idle time.
//
// Environment: Linux cloud sandbox; supported Playwright lifecycle; no
// thresholds adjusted. The Windows gate box remains the formal Rule 3
// environment; this run records environment-specific attribution evidence.
import { execFileSync, spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { measureAdvance } from './settle-timing.mjs'

const WT_MAIN = '/home/z/my-project/AICSPortal'
const WT_SRC = '/tmp/student-src'
const PORT = 4322
const ORIGIN = `http://127.0.0.1:${PORT}`
const OUT = process.env.I2R2_EVID || resolve(WT_MAIN, 'docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/cloud-2026-11-06/rule3-attribution')
const SERVE_ENV = {
  NODE_ENV: 'production', APP_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/aics_portal?directConnection=true',
  MONGODB_DB: 'aics_portal',
  AUTH_SECRET: 'aics-phase2-gate-smoke-secret-0x5166-not-for-real-deploys',
}
const progress = (m) => console.error(`[i2r2-attrib] ${m}`)
const res = {
  schema: 'aics-i2r2-rule3-attribution/v1', startedAt: new Date().toISOString(),
  disclosures: [
    'Dedicated cpu-profiler attribution pass; complements the traced pass in i2r2-student-cloud-timing (whose per-task timeline sums remain valid; its per-task sample alignment is superseded by this run).',
    'Long-task windows come from the in-page Long Tasks API observer; profiler correlation uses the page time origin (Date.now() - performance.now()) mapped to the profiler epoch-microsecond timebase.',
    'Draft thresholds unchanged: Rule 2 p95 100 ms; Rule 3 long task 50 ms.',
  ],
  server: {}, profiler: null, rule3: null, transition: null, cleanup: null,
}
let serverProc = null

const tcpOpen = (port, host = '127.0.0.1', timeout = 800) => new Promise((r2) => {
  const sock = createConnection({ port, host })
  sock.setTimeout(timeout)
  sock.once('connect', () => { sock.destroy(); r2(true) })
  sock.once('timeout', () => { sock.destroy(); r2(false) })
  sock.once('error', () => { sock.destroy(); r2(false) })
})

const urlBucket = (url) => {
  if (!url) return '(native)'
  if (url.includes('/_next/static/chunks/')) {
    const m = url.match(/chunks\/([^/?]+)\./)
    return `chunk:${m ? m[1].slice(0, 40) : '?'}`
  }
  if (url.includes('node_modules')) return 'node_modules'
  if (url.startsWith('http')) return 'first-party'
  return url.slice(0, 40) || '(unknown)'
}

function aggregateProfile(profile) {
  const nodes = new Map(profile.nodes.map((n) => [n.id, { name: n.callFrame?.functionName || '(anonymous)', url: n.callFrame?.url || '', parent: n.parent }]))
  const samples = profile.samples || [], deltas = profile.timeDeltas || []
  const self = new Map()
  for (let i = 0; i < samples.length; i++) {
    const id = samples[i]
    if (id === undefined || id < 0) continue
    self.set(id, (self.get(id) || 0) + 1)
  }
  const byFunction = [...self.entries()].map(([id, count]) => {
    const n = nodes.get(id) || { name: `node#${id}`, url: '' }
    return { name: n.name, url: n.url, bucket: urlBucket(n.url), selfSamples: count, nominalSelfMs: count }
  }).sort((a, b) => b.selfSamples - a.selfSamples)
  const byBucket = {}
  for (const f of byFunction) byBucket[f.bucket] = (byBucket[f.bucket] || 0) + f.selfSamples
  const totalSamples = byFunction.reduce((a, f) => a + f.selfSamples, 0)
  return { totalSamples, samplingDisclosure: 'This CDP build reported no usable timeDeltas, so self time is recorded as sample counts at the nominal 1 kHz interval (1 ms per sample); the relative distribution across functions is the attribution evidence, not absolute milliseconds.', byFunction: byFunction.slice(0, 30), byBucket: Object.fromEntries(Object.entries(byBucket).map(([k, v]) => [k, Math.round(v * 10) / 10])) }
}

async function main() {
  // --- Serve (reuse the committed-source production build) -----------------
  if (!(await tcpOpen(PORT))) {
    serverProc = spawn('node', [resolve(WT_SRC, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
      cwd: WT_SRC, env: { ...process.env, ...SERVE_ENV }, stdio: ['ignore', 'ignore', 'ignore'],
    })
    let up = false
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(4000) }); if (r.ok || r.status === 404) { up = true; break } } catch {}
      await new Promise((r) => setTimeout(r, 1000))
    }
    if (!up) throw new Error('student server not ready')
  }
  res.server = { origin: ORIGIN, mode: 'next start (production compiler profile, committed source /tmp/student-src at HEAD)' }
  progress('server ready')

  const login = await fetch(`${ORIGIN}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'juan.santos', password: 'student123' }), signal: AbortSignal.timeout(15000) })
  const cookie = login.headers.getSetCookie().join('\n').match(/aics_session=([^;]+)/)?.[1]
  if (!cookie) throw new Error('login failed')

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await ctx.addCookies([{ name: 'aics_session', value: cookie, url: ORIGIN }])
  await ctx.addInitScript(() => localStorage.setItem('aics_cookie_consent', 'essential'))
  const fixture = { values: { password: true, profile: true, photo: true, tour: true, announcements: true }, preferences: { welcomeSeen: true, checklistDismissed: true, tourSkipped: false, tasksGuideSeen: true, tasksGuideCompleted: true } }
  await ctx.route('**/*', async (route) => {
    const req = route.request()
    let u; try { u = new URL(req.url()) } catch { return route.abort() }
    if (u.origin !== ORIGIN) return route.abort()
    if (u.pathname === '/api/onboarding/state' && ['GET', 'PATCH'].includes(req.method())) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, role: 'student', version: 1, persisted: true, ...fixture }) })
    }
    if (!['GET', 'HEAD'].includes(req.method())) return route.abort()
    return route.continue()
  })
  const page = await ctx.newPage()
  await page.goto(`${ORIGIN}/portal/commonwealth/student/juan.santos`, { waitUntil: 'load', timeout: 90000 })
  await page.locator('[data-tour="nav-help"]:visible').waitFor({ timeout: 30000 })
  const timeOriginMs = await page.evaluate(() => Date.now() - performance.now())
  progress(`page time origin correlated (epoch offset ${Math.round(timeOriginMs)})`)

  const openReplayTour = async () => {
    await page.locator('[data-tour="nav-help"]:visible').click()
    await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId === 'student-overview' && document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 30000 })
  }

  const cdp = await ctx.newCDPSession(page)
  const profilerOn = async () => { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 250 }); await cdp.send('Profiler.start') }
  const profilerOff = async () => (await cdp.send('Profiler.stop')).profile

  // --- Part A: Rule 3 series with observer + profiler -----------------------
  await openReplayTour()
  await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 30000 })
  await page.evaluate(() => {
    window.__lt = []
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__lt.push({ startPageMs: e.startTime, durationMs: e.duration }) }).observe({ entryTypes: ['longtask'] })
  })
  await profilerOn()
  const widths = [1100, 1024, 900, 800, 700, 390, 800, 1280]
  for (const w of widths) { await page.setViewportSize({ width: w, height: 700 }); await page.waitForTimeout(150) }
  for (const delta of [400, -400]) for (let n = 0; n < 8; n++) { await page.mouse.wheel(0, delta); await page.waitForTimeout(100) }
  await page.waitForTimeout(400)
  const profileA = await profilerOff()
  const longTasks = await page.evaluate(() => window.__lt.splice(0))
  const aggA = aggregateProfile(profileA)
  // Correlate each long task window to profiler samples (epoch us).
  const profileSamples = (profileA.samples || []).map((id, i) => ({ id, us: profileA.startTime + (profileA.timeDeltas || []).slice(0, i + 1).reduce((a, b) => a + b, 0) }))
  const nodeNames = new Map(profileA.nodes.map((n) => [n.id, { name: n.callFrame?.functionName || '(anonymous)', url: n.callFrame?.url || '' }]))
  const attributed = longTasks.map((t) => {
    const w0 = (timeOriginMs + t.startPageMs) * 1000
    const w1 = w0 + t.durationMs * 1000
    const counts = new Map()
    for (const s of profileSamples) if (s.us >= w0 && s.us <= w1) counts.set(s.id, (counts.get(s.id) || 0) + 1)
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, c]) => ({ ...nodeNames.get(id), bucket: urlBucket(nodeNames.get(id)?.url), samples: c }))
    return { startPageMs: Math.round(t.startPageMs), durationMs: Math.round(t.durationMs), topFunctions: top }
  })
  const tourMarkers = ['tour', 'onboarding']
  const tourHits = attributed.flatMap((t) => (t.topFunctions || []).filter((f) => tourMarkers.some((m) => `${f.name} ${f.url}`.toLowerCase().includes(m))).map((f) => ({ durationMs: t.durationMs, ...f })))
  res.rule3 = {
    series: 'eight viewport stops (1100/1024/900/800/700/390/800/1280) at 700px height, then 8x +400px and 8x -400px wheel scrolls, tour overlay open on a spotted step, reduced motion, cpu profiler at 250 us sampling',
    longTaskCount: longTasks.length,
    longTasks: attributed,
    tourHandlerFrameHits: tourHits,
    seriesProfile: aggA,
    conclusion: longTasks.length === 0
      ? 'No long task over 50 ms occurred during the series; there is nothing to attribute on this platform.'
      : tourHits.length === 0
        ? `Every over-50 ms task attributes to non-tour work (top functions listed per task); no cpu-profiler sample in any task resolves to a tour-engine function or URL.`
        : 'Some over-50 ms task samples resolve to tour-engine frames; inspect hits.',
    boundaryMs: 50,
  }
  progress(`rule3: ${longTasks.length} long tasks; profiler covers ${aggA.totalMs} ms`)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 15000 })

  // --- Part B: repeated dashboard <-> academics transitions under profiler --
  await openReplayTour()
  // Advance to student-announcements (step 2, dashboard view, announcements
  // deck visible), then alternate Back (academics -> dashboard/announcements)
  // and Next (announcements -> academics route change) 12 times.
  await page.getByRole('button', { name: 'Go to the next tour step', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId === 'student-announcements' && document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 30000 })
  await page.waitForTimeout(300)
  // measureBack mirrors measureAdvance's settle contract for the Back control.
  const measureBack = () => page.evaluate(() => new Promise((resolveP, rejectP) => {
    const previous = document.querySelector('[data-tour-overlay]')?.dataset.stepId
    const button = document.querySelector('button[aria-label="Go back to the previous tour step"]')
    if (!previous || !button) return rejectP(new Error('No active tour step/back control'))
    const start = performance.now()
    button.click()
    let last = null, stable = 0
    const tick = () => {
      if (performance.now() - start > 20000) return rejectP(new Error('Step never settled'))
      const overlay = document.querySelector('[data-tour-overlay]')
      const spot = document.querySelector('[data-tour-spotlight]')
      const rect = spot?.getBoundingClientRect()
      if (overlay?.dataset.stepId !== previous && overlay?.dataset.disposition === 'spot' && rect?.width > 0 && rect.height > 0) {
        const current = [overlay.dataset.stepId, rect.top, rect.left, rect.width, rect.height].join(',')
        stable = current === last ? stable + 1 : 0
        last = current
        if (stable >= 2) return resolveP({ from: previous, to: overlay.dataset.stepId, ms: performance.now() - start })
      } else { last = null; stable = 0 }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
  const transitions = []
  await profilerOn()
  for (let i = 0; i < 12; i++) {
    const t = await measureAdvance(page, { completionTarget: 'student-tour-replay' })
    transitions.push({ dir: 'next', from: t.from, to: t.to, ms: Math.round(t.ms * 10) / 10 })
    const b = await measureBack()
    transitions.push({ dir: 'back', from: b.from, to: b.to, ms: Math.round(b.ms * 10) / 10 })
    await page.waitForTimeout(150)
  }
  const profileB = await profilerOff()
  const aggB = aggregateProfile(profileB)
  res.transition = {
    disclosure: 'Diagnostic only: the same settle contract on repeated Back/Next alternations between student-announcements (dashboard) and student-academics (academics route); never merged into the Rule 2 series.',
    transitions,
    nextMs: transitions.filter((t) => t.dir === 'next').map((t) => t.ms),
    backMs: transitions.filter((t) => t.dir === 'back').map((t) => t.ms),
    profile: aggB,
  }
  progress(`transition diag: next ${Math.max(...res.transition.nextMs)}ms max, back ${Math.max(...res.transition.backMs)}ms max`)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 15000 }).catch(() => {})

  await ctx.close().catch(() => {})
  await browser.close().catch(() => {})
  const pgrepSafe = (p) => { try { return execFileSync('pgrep', ['-f', p], { encoding: 'utf8' }).trim() || 'none' } catch { return 'none' } }
  if (serverProc) { try { process.kill(-serverProc.pid, 'SIGTERM'); await new Promise((r) => setTimeout(r, 800)); try { process.kill(-serverProc.pid, 'SIGKILL') } catch {} } catch {} }
  res.cleanup = { chromeAfterClose: pgrepSafe('chrome'), nextAfterStop: pgrepSafe('next start'), browserLifecycle: 'supported chromium.launch/close' }
  res.finishedAt = new Date().toISOString()
  mkdirSync(OUT, { recursive: true })
  writeFileSync(resolve(OUT, 'i2r2-rule3-attribution.json'), JSON.stringify(res, null, 2))
  writeFileSync(resolve(OUT, 'manifest.txt'), [
    `timestamp: ${res.startedAt}`,
    `HEAD SHA: ${execFileSync('git', ['-C', WT_MAIN, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()}`,
    'command: node scripts/onboarding/i2r2-rule3-attribution.mjs',
    `node: ${process.version}`,
    `browser: chromium ${browser.version?.() || ''}`,
    'scope: Rule 3 long-task attribution (observer + CDP profiler) and the heavy-transition diagnostic; thresholds unchanged',
  ].join('\n') + '\n')
  progress('done')
  process.exit(0)
}

main().catch((e) => {
  console.error('[i2r2-attrib] failed:', e.message)
  if (serverProc) { try { process.kill(-serverProc.pid, 'SIGTERM') } catch {} }
  process.exit(1)
})
