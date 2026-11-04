// I2 Rules 2 and 3 - Linux environment-specific timing measurements.
// Rule 2: step-advance timing p95 (click to new spotlight settled), 21
// measured advances per run after a complete disclosed warm-up tour,
// three runs. Each run's measurements and percentiles come from that
// run's 21 samples only; runs are never pooled (2026-11-05 correction:
// the first Linux run pooled the runs, so its recorded per-run aggregates
// are historical evidence, not per-run values). Rule 3: long tasks during
// a scripted resize/scroll series, recorded window-level with the Long
// Tasks API (attribution beyond the window is not claimed). No thresholds
// are adjusted; the draft 100 ms limit and the 50 ms long-task boundary
// are recorded as they stand.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'
import { SignJWT } from 'jose'
import { chromium } from 'playwright'

const WT_MAIN = '/home/z/my-project/AICSPortal'
const WT_PROBE = '/tmp/i2r4-probe'
const PROBE_PORT = 4321
const ORIGIN = `http://127.0.0.1:${PROBE_PORT}`
const OUT = process.env.I2R4_EVID || resolve(WT_MAIN, '.phase2-cloud/i2r4-linux-timing-1')
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'
const progress = (m) => console.error(`[i2r3-linux] ${m}`)
const res = {
  schema: 'aics-i2r3-linux-timing/v1', startedAt: new Date().toISOString(),
  disclosures: [
    'Environment-specific: Linux cloud sandbox, production compiler profile via the probe-flagged worktree build.',
    'Rule 2 timings are full student-visible transitions inside the synthetic tour (click to new spotlight settled twice two frames apart); they are not an isolated pure-handler CPU measurement.',
    'Rule 3 long tasks are window-level Long Tasks API entries; ownership attribution beyond "occurred while the tour was open" is not claimed.',
    'Rule 2 per-run aggregates (advances, p95, median, max) are computed from that run\'s 21 samples only; runs are never pooled.',
    'Draft thresholds recorded unchanged: Rule 2 p95 100 ms; Rule 3 long task 50 ms.',
  ],
  rule2: [], rule3: {}, cleanup: null,
}
let serverProc = null
const tcpOpen = (port, host = '127.0.0.1', timeout = 800) => new Promise((r2) => {
  const sock = createConnection({ port, host })
  sock.setTimeout(timeout)
  sock.once('connect', () => { sock.destroy(); r2(true) })
  sock.once('timeout', () => { sock.destroy(); r2(false) })
  sock.once('error', () => { sock.destroy(); r2(false) })
})

async function main() {
  if (!(await tcpOpen(PROBE_PORT))) {
    serverProc = spawn('node', [resolve(WT_PROBE, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(PROBE_PORT)], {
      cwd: WT_PROBE,
      env: { ...process.env, APP_ENV: 'development', MONGODB_URI: 'mongodb://127.0.0.1:27017', MONGODB_DB: 'aics_portal' },
      stdio: ['ignore', 'ignore', 'ignore'],
    })
    let up = false
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(4000) }); if (r.ok || r.status === 404) { up = true; break } } catch {}
      await new Promise((r) => setTimeout(r, 1000))
    }
    if (!up) throw new Error('probe server not ready')
  }
  progress('probe server ready')
  const session = await new SignJWT({ role: 'student', branch: 'commonwealth', tv: 0 })
    .setProtectedHeader({ alg: 'HS256' }).setSubject('juan.santos').setIssuedAt().setExpirationTime('8h')
    .sign(new TextEncoder().encode(DEV_SECRET))
  mkdirSync(OUT, { recursive: true })
  writeFileSync(resolve(OUT, 'baseline-sha.txt'), readBaseline())
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await ctx.addCookies([{ name: 'aics_session', value: session, url: ORIGIN }])
  await ctx.addInitScript(`localStorage.setItem('aics_cookie_consent', 'essential')`)
  let blocked = 0, completionSimulated = 0
  await ctx.route('**/*', async (route) => {
    const req = route.request()
    let u; try { u = new URL(req.url()) } catch { return route.abort() }
    if (!(['localhost', '127.0.0.1'].includes(u.hostname) && Number(u.port) === PROBE_PORT)) { blocked++; return route.abort() }
    if (req.method() === 'PATCH' && u.pathname === '/api/onboarding/state') { completionSimulated++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, persisted: false }) }) }
    if (req.method() === 'GET' && u.pathname === '/api/onboarding/state') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, role: 'student', version: 1, persisted: false, values: { password: true, profile: true, photo: true, tour: true, announcements: true }, preferences: { welcomeSeen: true, checklistDismissed: true, tourSkipped: false, tasksGuideSeen: true, tasksGuideCompleted: true } }) })
    if (!['GET', 'HEAD'].includes(req.method())) return route.abort()
    return route.continue()
  })
  const page = await ctx.newPage()
  await page.goto(`${ORIGIN}/portal/commonwealth/student/juan.santos`, { waitUntil: 'load', timeout: 90000 })
  await page.locator('[data-tour="dev-tour-launcher"]').waitFor({ timeout: 45000 })

  const walkTour = async () => {
    await page.locator('[data-tour="dev-tour-launcher"]').click()
    await page.locator('[data-tour-overlay]').waitFor({ state: 'visible', timeout: 10000 })
    let prev = await page.evaluate(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId)
    for (let i = 1; i <= 7; i++) {
      await page.click('button[aria-label="Go to the next tour step"]')
      await page.waitForFunction((p) => { const id = document.querySelector('[data-tour-overlay]')?.dataset.stepId; return !!id && id !== p }, prev, { timeout: 15000 })
      prev = await page.evaluate(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId)
    }
    await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId === 'dev-8', null, { timeout: 15000 })
    await page.click('button[aria-label="Finish the guided tour"]')
    await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 15000 })
  }

  // --- Rule 2: three runs, one complete warm-up tour before each, 21 measured advances after it.
  // Each tour contributes 7 measured advances (six Next advances plus the
  // Finish advance; measureAdvance resolves on the new settled spotlight,
  // or on completed for Finish), so three tours make 21. `times` is reset
  // per run and each run's summary is computed from that run's samples
  // only, so no earlier run can shift a later run's percentiles.
  const { measureAdvance, summarizeTimingRun } = await import(resolve(WT_MAIN, 'scripts/onboarding/settle-timing.mjs'))
  for (let run = 1; run <= 3; run++) {
    progress(`rule2 run ${run}: warm-up tour (disclosed) then 21 measured advances`)
    await walkTour()
    const times = []
    for (let a = 0; a < 3; a++) {
      await page.locator('[data-tour="dev-tour-launcher"]').click()
      await page.locator('[data-tour-overlay]').waitFor({ state: 'visible', timeout: 10000 })
      let done = false
      while (!done) {
        const t = await measureAdvance(page)
        times.push({ run, advance: times.length + 1, from: t.from, to: t.to, ms: Math.round(t.ms * 10) / 10 })
        done = t.to === 'completed'
      }
      await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 15000 })
    }
    const summary = summarizeTimingRun(times)
    res.rule2.push({ run, ...summary, samples: times })
    progress(`rule2 run ${run}: p95=${summary.p95Ms}ms over ${summary.advances} advances`)
  }

  // --- Rule 3: long tasks during a scripted resize/scroll series ----------
  await page.locator('[data-tour="dev-tour-launcher"]').click()
  await page.locator('[data-tour-overlay]').waitFor({ state: 'visible', timeout: 10000 })
  await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 15000 })
  await page.evaluate(() => {
    globalThis.__longtasks = []
    new PerformanceObserver((list) => { for (const e of list.getEntries()) globalThis.__longtasks.push({ start: Math.round(e.startTime), duration: Math.round(e.duration) }) })
      .observe({ entryTypes: ['longtask'] })
  })
  const widths = [1280, 1100, 1024, 1180, 900, 1280]
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 800 })
    await page.waitForTimeout(250)
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.waitForTimeout(250)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(500)
  const tasks = await page.evaluate(() => globalThis.__longtasks.splice(0))
  res.rule3 = {
    series: 'six viewport-width stops (1280/1100/1024/1180/900/1280), each with a 600px scroll down and back at reduced motion, tour overlay open on a spotted step',
    longTasks: tasks,
    count: tasks.length,
    maxMs: tasks.length ? Math.max(...tasks.map((t) => t.duration)) : 0,
    boundaryMs: 50,
    attribution: 'window-level entries only; the Long Tasks API reports no script ownership, so attribution to tour handlers is NOT claimed',
  }
  progress(`rule3: ${tasks.length} long tasks, max ${res.rule3.maxMs}ms`)

  await ctx.close().catch(() => {})
  await browser.close().catch(() => {})
  const pgrepSafe = (p) => { try { return execFileSync('pgrep', ['-f', p], { encoding: 'utf8' }).trim() || 'none' } catch { return 'none' } }
  if (serverProc) { try { process.kill(-serverProc.pid, 'SIGTERM'); await new Promise((r) => setTimeout(r, 800)); try { process.kill(-serverProc.pid, 'SIGKILL') } catch {} } catch {} }
  res.cleanup = { chromeAfterClose: pgrepSafe('chrome'), nextAfterStop: pgrepSafe('next start'), browserLifecycle: 'supported chromium.launch/close' }
  res.finishedAt = new Date().toISOString()
  writeFileSync(resolve(OUT, 'i2r3-linux-timing.json'), JSON.stringify(res, null, 2))
  writeFileSync(resolve(OUT, 'manifest.txt'), [
    `timestamp: ${res.startedAt}`,
    `baseline SHA: ${readBaseline()}`,
    `HEAD SHA: ${execFileSync('git', ['-C', WT_MAIN, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()}`,
    'command: node scripts/onboarding/i2r3-linux-timing.mjs (probe-flagged worktree build served with next start)',
    `node: ${process.version}`,
    'scope: I2 rules 2 and 3 Linux environment-specific measurements; thresholds unchanged',
  ].join('\n') + '\n')
  progress('done')
  process.exit(0)
}

function readBaseline() {
  return existsSync(resolve(WT_MAIN, '.phase2-cloud/baseline-sha.txt'))
    ? execFileSync('cat', [resolve(WT_MAIN, '.phase2-cloud/baseline-sha.txt')], { encoding: 'utf8' }).trim()
    : execFileSync('git', ['-C', WT_MAIN, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
}

main().catch((e) => {
  console.error('[i2r3-linux] failed:', e.message)
  if (serverProc) { try { process.kill(-serverProc.pid, 'SIGTERM') } catch {} }
  process.exit(1)
})
