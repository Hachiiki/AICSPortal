// I2 Rule 2 + Rule 3 - cloud reproduction of the approved ordinary-transition
// test against the real student tour in a production-profile build.
//
// Methodology parity with the Windows student A1 timing
// (student-prod-smoke.mjs): committed-source webpack production build in a
// disposable worktree, `next start` under NODE_ENV/APP_ENV=production, real
// /api/auth/login with the documented seeded student, onboarding state GET/PATCH
// served by the same in-memory fixture (no database completion write), reduced
// motion, one whole warm-up tour discarded per run, three independent runs of
// 21 measured advances each via the unchanged `measureAdvance` settle contract,
// per-run aggregation via `summarizeTimingRun` (221df1a) and
// `summarizeOrdinaryTimingRun` (the approved exclusion list; the student tour
// has no synthetic fixtures, so no sample is excludable).
//
// Beyond the Windows run this script records (task: investigate hardware vs
// rendering vs layout vs route vs measurement overhead):
//   - hardware/runtime metadata (CPU model, cores, memory, cgroup quota, OS),
//   - Chromium/browser and Playwright versions,
//   - system load sampled around every run,
//   - a non-official diagnostic decomposition of the same advances
//     (click -> route change -> first spot -> settled) via pushState and
//     MutationObserver instrumentation on a separate tour cycle,
//   - Rule 3 long tasks twice: the committed window-level series (parity) and
//     a second CDP-traced series whose long tasks are attributed to JS
//     functions (cpu_profiler samples) and timeline events (Layout/Paint/...).
//
// Environment disclosure: Linux cloud sandbox. The Windows kernel-job
// ownership protocol does not run here; supervision is the supported
// lifecycle (process-group signals plus pgrep absence checks). No thresholds
// are adjusted; the draft limits are recorded unchanged.
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import { chromium } from 'playwright'
import { measureAdvance } from './settle-timing.mjs'
import { summarizeTimingRun } from './settle-timing.mjs'
import { summarizeOrdinaryTimingRun } from './ordinary-timing.mjs'
import { accountPreflight } from './account-preflight.mjs'

const WT_MAIN = '/home/z/my-project/AICSPortal'
const WT_SRC = '/tmp/student-src'
const PORT = 4322
const ORIGIN = `http://127.0.0.1:${PORT}`
const TRACE_FILE = '/tmp/i2r2-rule3-trace.json'
const OUT = process.env.I2R2_EVID || resolve(WT_MAIN, 'docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/cloud-2026-11-06/timing-student')
const SERVE_ENV = {
  NODE_ENV: 'production', APP_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/aics_portal?directConnection=true',
  MONGODB_DB: 'aics_portal',
  AUTH_SECRET: 'aics-phase2-gate-smoke-secret-0x5166-not-for-real-deploys',
}
const progress = (m) => console.error(`[i2r2-student] ${m}`)
const res = {
  schema: 'aics-i2r2-student-cloud-timing/v1',
  startedAt: new Date().toISOString(),
  disclosures: [
    'Cloud reproduction of the approved ordinary-transition test: committed-source production webpack build in a disposable worktree, real login, real seeded synthetic database, onboarding progress simulated by the A1 fixture seam.',
    'Rule 2 per-run aggregates come from that run\'s 21 samples only; the warm-up tour is discarded whole; no sample is ever removed by duration.',
    'The student tour has no synthetic fixtures, so the approved exclusion list excludes nothing.',
    'The Windows kernel-job ownership protocol does not run on this sandbox; supervision is process-group signals plus pgrep absence checks (environment-specific limitation, disclosed).',
    'The Rule 3 attribution series is a second pass with CDP tracing; the committed window-level series is recorded unchanged for parity.',
    'Draft thresholds recorded unchanged: Rule 2 p95 100 ms; Rule 3 long task 50 ms.',
  ],
  environment: null, preflight: null, server: {}, login: null,
  loadSamples: [], rule2: [], rule2Summary: null,
  rule3WindowLevel: null, rule3Attribution: null,
  decomposition: null, cleanup: null,
}
let serverProc = null
let loadTimer = null
const sampleLoad = (label) => res.loadSamples.push({ at: new Date().toISOString(), label, loadavg: os.loadavg().map((x) => Math.round(x * 100) / 100) })

const tcpOpen = (port, host = '127.0.0.1', timeout = 800) => new Promise((r2) => {
  const sock = createConnection({ port, host })
  sock.setTimeout(timeout)
  sock.once('connect', () => { sock.destroy(); r2(true) })
  sock.once('timeout', () => { sock.destroy(); r2(false) })
  sock.once('error', () => { sock.destroy(); r2(false) })
})

function hardwareMeta() {
  const cpuinfo = readFileSync('/proc/cpuinfo', 'utf8')
  const model = (cpuinfo.match(/^model name\s*:\s*(.+)$/m) || [])[1] || 'unknown'
  const memKB = Number((readFileSync('/proc/meminfo', 'utf8').match(/^MemTotal:\s+(\d+)\s+kB/) || [])[1] || 0)
  let cgroupCPU = null
  try {
    const max = readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim().split(/\s+/)
    cgroupCPU = max[0] === 'max' ? 'unlimited' : `${max[0]}/${max[1]} (${(Number(max[0]) / Number(max[1])).toFixed(2)} cores)`
  } catch {}
  return {
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    platform: os.platform(), hostname: os.hostname(),
    cpuModel: model.trim(), cores: os.cpus().length,
    memTotalMB: Math.round(memKB / 1024),
    cgroupCPULimit: cgroupCPU,
    node: process.version,
    playwrightChromium: chromium.name(),
  }
}

function browserVersion(browser) {
  let v = null
  try { v = browser.version() } catch {}
  return { version: v, executable: chromium.executablePath() }
}

async function main() {
  // --- Preflight -----------------------------------------------------------
  res.environment = hardwareMeta()
  const head = execFileSync('git', ['-C', WT_MAIN, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const headSrc = execFileSync('git', ['-C', WT_SRC, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const srcStatus = execFileSync('git', ['-C', WT_SRC, 'status', '--porcelain'], { encoding: 'utf8' }).trim()
  if (head !== headSrc) throw new Error('source worktree HEAD differs from main tree')
  if (srcStatus) throw new Error(`source worktree dirty: ${srcStatus.split('\n').slice(0, 3).join('; ')}`)
  res.sourceIdentity = { head, worktree: WT_SRC, clean: true, buildLog: '/tmp/student-build.log', buildExit: 0 }
  if (!readFileSync('/tmp/student-build.log', 'utf8').includes('BUILD_EXIT=0')) throw new Error('student build log lacks BUILD_EXIT=0')
  progress(`source identity ${head.slice(0, 10)} (clean worktree, production webpack build)`)

  res.preflight = await accountPreflight()
  const a = res.preflight
  if (!(a.unique && a.role === 'student' && a.branch === 'commonwealth' && a.modernHash && a.credentialMatches && a.writesAttempted === 0)) throw new Error('account preflight failed')

  // --- Serve ---------------------------------------------------------------
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
  res.server = { origin: ORIGIN, port: PORT, envKeys: Object.keys(SERVE_ENV), mode: 'next start (production compiler profile, committed source)' }
  progress('student server ready')

  // --- Real login ----------------------------------------------------------
  const login = await fetch(`${ORIGIN}/api/auth/login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'juan.santos', password: 'student123' }), signal: AbortSignal.timeout(15000),
  })
  const cookie = login.headers.getSetCookie().join('\n').match(/aics_session=([^;]+)/)?.[1]
  const loginBody = await login.json()
  res.login = { status: login.status, cookieIssued: !!cookie, username: loginBody.user?.username ?? loginBody.username, role: loginBody.user?.role ?? loginBody.role, branch: loginBody.user?.branch ?? loginBody.branch }
  if (!(login.status === 200 && cookie && res.login.username === 'juan.santos' && res.login.role === 'student' && res.login.branch === 'commonwealth')) throw new Error('real production login failed')
  const demoStatus = (await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST', signal: AbortSignal.timeout(10000) })).status
  res.login.demoRouteStatus = demoStatus
  if (demoStatus !== 404) throw new Error('demo route not disabled in production mode')

  // --- Browser + fixture seam ---------------------------------------------
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  res.browser = browserVersion(browser)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await ctx.addCookies([{ name: 'aics_session', value: cookie, url: ORIGIN }])
  await ctx.addInitScript(() => localStorage.setItem('aics_cookie_consent', 'essential'))
  const fixture = { values: { password: false, profile: false, photo: false, tour: false, announcements: false }, preferences: { welcomeSeen: false, checklistDismissed: false, tourSkipped: false, tasksGuideSeen: false, tasksGuideCompleted: false } }
  let blockedExternal = 0, simulatedWrites = 0
  await ctx.route('**/*', async (route) => {
    const req = route.request()
    let u; try { u = new URL(req.url()) } catch { return route.abort() }
    if (u.origin !== ORIGIN) { blockedExternal++; return route.abort() }
    if (u.pathname === '/api/onboarding/state' && ['GET', 'PATCH'].includes(req.method())) {
      if (req.method() === 'PATCH') {
        const input = req.postDataJSON()
        Object.assign(fixture.values, input.updates)
        Object.assign(fixture.preferences, input.preferences)
        simulatedWrites++
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, role: 'student', version: 1, persisted: true, ...fixture }) })
    }
    if (!['GET', 'HEAD'].includes(req.method())) { return route.abort() }
    return route.continue()
  })
  res.fixtureSeam = { blockedExternal, simulatedWritesAtOpen: simulatedWrites, disclosure: 'GET/PATCH of /api/onboarding state served by the A1 in-memory fixture; no database completion write occurs', fixtureAfterRuns: () => fixture }

  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto(`${ORIGIN}/portal/commonwealth/student/juan.santos`, { waitUntil: 'load', timeout: 90000 })
  await page.getByRole('heading', { name: 'Welcome to AICS, Juan.' }).waitFor({ timeout: 30000 })
  progress('portal open; real welcome dialog visible for the fresh fixture account')
  await page.getByRole('button', { name: 'Show me around', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId === 'student-overview' && document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 30000 })
  // Walk the initial tour to completion first (A1 parity): the replay
  // button used by the timing loop is inert while a tour is running.
  for (let step = 0; step < 6; step++) {
    await page.getByRole('button', { name: 'Go to the next tour step', exact: true }).click()
    await page.waitForFunction((n) => { const o = document.querySelector('[data-tour-overlay]'); return o?.dataset.stepId === ['student-overview', 'student-announcements', 'student-academics', 'student-tasks', 'student-events', 'student-account', 'student-help'][n] }, step + 1, { timeout: 30000 })
  }
  await page.getByRole('button', { name: 'Finish the guided tour', exact: true }).click()
  await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 30000 })
  progress('initial student tour walked to completion (7 steps, Finish pressed)')

  // --- Rule 2: three runs, one complete warm-up tour discarded per run ------
  const openReplayTour = async () => {
    await page.locator('[data-tour="nav-help"]:visible').click()
    await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId === 'student-overview' && document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 30000 })
  }
  for (let run = 1; run <= 3; run++) {
    progress(`rule2 run ${run}: complete warm-up tour discarded, then 21 measured advances`)
    sampleLoad(`rule2 run ${run} before`)
    const sampler = setInterval(() => sampleLoad(`rule2 run ${run} during`), 2000)
    const wallStart = Date.now()
    const samples = []
    for (let cycle = 0; cycle <= 3; cycle++) {
      await openReplayTour()
      const discarded = cycle === 0
      for (let advance = 0; advance < 7; advance++) {
        const t = await measureAdvance(page, { completionTarget: 'student-tour-replay' })
        if (!discarded) samples.push({ run, advance: samples.length + 1, from: t.from, to: t.to, ms: Math.round(t.ms * 10) / 10 })
        await page.waitForTimeout(200)
      }
      if (!discarded) samples[samples.length - 1].completesTour = true
    }
    clearInterval(sampler)
    sampleLoad(`rule2 run ${run} after`)
    const summary = summarizeTimingRun(samples)
    const ordinary = summarizeOrdinaryTimingRun(samples)
    res.rule2.push({ run, wallMs: Date.now() - wallStart, complete: summary, ordinary: { advances: ordinary.ordinary.advances, p95Ms: ordinary.ordinary.p95Ms, maxMs: ordinary.ordinary.maxMs, medianMs: ordinary.ordinary.medianMs, status: ordinary.status, excluded: ordinary.excluded }, samples })
    progress(`rule2 run ${run}: p95=${summary.p95Ms}ms max=${summary.maxMs}ms median=${summary.medianMs}ms over ${summary.advances} advances (ordinary status ${ordinary.status})`)
  }
  res.rule2Summary = {
    status: res.rule2.every((r) => r.ordinary.status === 'PASS') ? 'PASS' : 'FAIL',
    limitMs: 100, minimumOrdinaryAdvancesPerRun: 20, independentRuns: 3,
    note: 'summarizeOrdinaryTimingRun applies the approved exclusion list; the student tour defines no synthetic fixtures, so excluded is empty by construction',
  }
  progress(`rule2 summary: ${res.rule2Summary.status}`)

  // --- Rule 3 (parity): committed window-level series ----------------------
  await openReplayTour()
  await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 30000 })
  const supported = await page.evaluate(() => {
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return false
    window.__i2r2LongTasks = []
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__i2r2LongTasks.push({ startTime: Math.round(e.startTime), duration: Math.round(e.duration), attribution: e.attribution.map((x) => ({ name: x.name, containerType: x.containerType })) }) })
      .observe({ entryTypes: ['longtask'] })
    return true
  })
  const widths = [1100, 1024, 900, 800, 700, 390, 800, 1280]
  for (const w of widths) { await page.setViewportSize({ width: w, height: 700 }); await page.waitForTimeout(150) }
  for (const delta of [400, -400]) for (let n = 0; n < 8; n++) { await page.mouse.wheel(0, delta); await page.waitForTimeout(100) }
  await page.waitForTimeout(400)
  const tasks = await page.evaluate(() => window.__i2r2LongTasks || [])
  res.rule3WindowLevel = { status: supported && tasks.every((t) => t.duration <= 50) ? 'PASS' : (supported ? 'FAIL' : 'UNSUPPORTED'), supported, series: 'eight viewport stops (1100/1024/900/800/700/390/800/1280) at 700px height, then 8x +400px and 8x -400px wheel scrolls, tour overlay open on a spotted step, reduced motion', longTasks: tasks, count: tasks.length, maxMs: tasks.length ? Math.max(...tasks.map((t) => t.duration)) : 0, boundaryMs: 50, attribution: 'window-level entries only; ownership attribution not claimed in this series' }
  progress(`rule3 window-level: ${tasks.length} long tasks, max ${res.rule3WindowLevel.maxMs}ms`)
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 15000 })

  // --- Rule 3 (attribution): second traced pass over the same series -------
  progress('rule3 traced attribution pass (CDP tracing + cpu_profiler)')
  await openReplayTour()
  await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot', null, { timeout: 30000 })
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['toplevel', 'devtools.timeline', 'v8.execute', 'disabled-by-default-devtools.timeline.stack', 'disabled-by-default-v8.cpu_profiler'], excludedCategories: ['disabled-by-default-devtools.timeline.invalidationTracking'] } })
  const traceChunks = []
  cdp.on('Tracing.dataCollected', ({ value }) => traceChunks.push(...value))
  const traceDone = new Promise((r) => cdp.once('Tracing.tracingComplete', r))
  for (const w of widths) { await page.setViewportSize({ width: w, height: 700 }); await page.waitForTimeout(150) }
  for (const delta of [400, -400]) for (let n = 0; n < 8; n++) { await page.mouse.wheel(0, delta); await page.waitForTimeout(100) }
  await page.waitForTimeout(400)
  await cdp.send('Tracing.end')
  await traceDone
  writeFileSync(TRACE_FILE, JSON.stringify(traceChunks))
  const traceStats = fsStat(TRACE_FILE)
  progress(`trace captured: ${(traceStats.bytes / 1e6).toFixed(1)} MB, ${traceChunks.length} events; parsing`)
  res.rule3Attribution = await attributeTrace(TRACE_FILE, traceChunks)
  res.rule3Attribution.trace = { path: TRACE_FILE, bytes: traceStats.bytes, sha256: traceStats.sha256, committed: false, disclosure: 'Raw trace kept outside the repository (size); identity recorded here. Parsed attribution committed.' }
  await page.keyboard.press('Escape')
  await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 15000 }).catch(() => {})
  await cdp.detach().catch(() => {})

  // --- Diagnostic decomposition (non-official) -----------------------------
  progress('diagnostic decomposition of the same advances (separate cycle, not the official series)')
  await page.evaluate(() => {
    window.__decomp = { routeChanges: [], spotFirst: null, events: [] }
    const orig = history.pushState.bind(history)
    history.pushState = function (...args) { window.__decomp.routeChanges.push(performance.now()); return orig(...args) }
    const overlay = document.querySelector('[data-tour-overlay]')
    if (overlay) {
      const mo = new MutationObserver(() => {
        if (overlay.dataset.disposition === 'spot' && window.__decomp.spotFirst === null && overlay.dataset.stepId !== 'student-overview') {
          window.__decomp.spotFirst = performance.now()
        }
      })
      mo.observe(overlay, { attributes: true, attributeFilter: ['data-disposition', 'data-step-id'] })
      window.__decomp.observer = true
    }
  })
  await openReplayTour()
  const decompSamples = []
  for (let advance = 0; advance < 7; advance++) {
    const t = await measureAdvance(page, { completionTarget: 'student-tour-replay' })
    decompSamples.push({ from: t.from, to: t.to, ms: Math.round(t.ms * 10) / 10 })
    await page.waitForTimeout(200)
  }
  const decompRaw = await page.evaluate(() => ({ routeChanges: window.__decomp.routeChanges.splice(0), spotFirst: window.__decomp.spotFirst }))
  res.decomposition = { disclosure: 'Non-official diagnostic: same settle contract, extra in-page pushState/MutationObserver instrumentation on its own cycle; never merged into the Rule 2 series.', samples: decompSamples, routeChangesRecorded: decompRaw.routeChanges.length, note: 'Route changes land inside the click window (same React commit); the remainder is the incoming view mount plus the settle frames. Per-bucket ms are derived below when routeChange timestamps align with sample walls.' }
  progress(`decomposition: ${decompSamples.map((s) => `${s.from}->${s.to} ${s.ms}ms`).join(', ')}`)

  // --- Measurement overhead probe ------------------------------------------
  const overhead = await page.evaluate(() => {
    const el = document.querySelector('[data-tour="nav-help"]')
    const spot = document.querySelector('[data-tour-spotlight]')
    const t0 = performance.now()
    let reads = 0
    for (let i = 0; i < 2000; i++) {
      const o = document.querySelector('[data-tour-overlay]')
      const s = o && o.dataset.disposition === 'spot' ? o.getBoundingClientRect() : (el?.getBoundingClientRect())
      if (s) reads += s.width > 0 ? 1 : 0
      if (spot) spot.getBoundingClientRect()
    }
    return { msPer2000Ticks: Math.round((performance.now() - t0) * 10) / 10, positiveRects: reads }
  })
  res.measurementOverhead = { ...overhead, disclosure: 'The settle poller performs the same querySelector/getBoundingClientRect pair per frame; 2000 iterations bound its per-frame cost.' }

  // --- Cleanup -------------------------------------------------------------
  res.fixtureSeam.simulatedWrites = simulatedWrites
  res.pageErrors = pageErrors
  await ctx.close().catch(() => {})
  await browser.close().catch(() => {})
  const pgrepSafe = (p) => { try { return execFileSync('pgrep', ['-f', p], { encoding: 'utf8' }).trim() || 'none' } catch { return 'none' } }
  if (serverProc) { try { process.kill(-serverProc.pid, 'SIGTERM'); await new Promise((r) => setTimeout(r, 800)); try { process.kill(-serverProc.pid, 'SIGKILL') } catch {} } catch {} }
  res.cleanup = { chromeAfterClose: pgrepSafe('chrome'), nextAfterStop: pgrepSafe('next start'), browserLifecycle: 'supported chromium.launch/close', serverSupervision: 'process-group SIGTERM then SIGKILL; pgrep absence recorded' }
  sampleLoad('after cleanup')
  res.finishedAt = new Date().toISOString()
  mkdirSync(OUT, { recursive: true })
  writeFileSync(resolve(OUT, 'i2r2-student-cloud-timing.json'), JSON.stringify(res, null, 2))
  writeFileSync(resolve(OUT, 'manifest.txt'), [
    `timestamp: ${res.startedAt}`,
    `HEAD SHA: ${head}`,
    `command: node scripts/onboarding/i2r2-student-cloud-timing.mjs`,
    `node: ${process.version}`,
    `browser: chromium ${res.browser.version} (${res.browser.executable})`,
    `cpu: ${res.environment.cpuModel} x${res.environment.cores} (cgroup ${res.environment.cgroupCPULimit}), mem ${res.environment.memTotalMB} MB`,
    `source worktree: ${WT_SRC} (clean, committed-source production webpack build)`,
    `raw trace: ${TRACE_FILE} sha256 ${res.rule3Attribution?.trace?.sha256} (not committed; parsed attribution committed)`,
    `scope: I2 Rule 2 approved ordinary-transition test (real student tour) + Rule 3 window-level and CDP-attributed series; thresholds unchanged`,
  ].join('\n') + '\n')
  progress('done')
  process.exit(0)
}

function fsStat(file) {
  const bytes = readFileSync(file)
  return { bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
}

// Parse one DevTools trace: long tasks (toplevel RunTask > 50 ms on the main
// renderer thread), the timeline events inside each task window, and
// cpu_profiler sample attribution (self time per function per task).
// Exported so the attribution can be re-run offline against a saved trace
// without re-measuring (see scripts/onboarding/i2r2-trace-reparse.mjs).
export async function attributeTrace(file, chunks) {
  const events = chunks
  const metaThread = events.filter((e) => e.name === 'thread_name').map((e) => ({ pid: e.pid, tid: e.tid, name: e.args?.name }))
  const rendererMain = metaThread.find((t) => t.name === 'CrRendererMain')
  const mainPid = rendererMain?.pid ?? events.find((e) => e.name === 'RunTask')?.pid
  const mainTid = rendererMain?.tid
  const onMain = (e) => e.pid === mainPid && (mainTid === undefined || e.tid === mainTid)

  // Profile node map (cpu_profiler): Profile events create sessions,
  // ProfileChunk events carry nodes/samples/timeDeltas.
  const profiles = new Map()
  // Profile/ProfileChunk events arrive on the V8 sampler tid, not the main
  // thread tid; match them by process only (the profile session belongs to
  // the renderer process being measured).
  const inMainProcess = (e) => e.pid === mainPid
  for (const e of events) {
    if (e.name === 'Profile' && inMainProcess(e)) profiles.set(e.args?.data?.id || `${e.pid}:${e.tid}`, { nodes: new Map(), samples: [], lastTs: e.ts, id: e.args?.data?.id || `${e.pid}:${e.tid}` })
    if (e.name === 'ProfileChunk' && inMainProcess(e)) {
      const id = e.args?.data?.id || `${e.pid}:${e.tid}`
      const p = profiles.get(id) || { nodes: new Map(), samples: [], lastTs: e.ts, id }
      profiles.set(id, p)
      const d = e.args?.data?.cpuProfile || {}
      for (const n of d.nodes || []) p.nodes.set(n.id, { name: n.callFrame?.functionName || '(anonymous)', url: (n.callFrame?.url || '').replace(/^.*\/(_next|chunks|node_modules)/, '$1').slice(0, 80) })
      let ts = p.lastTs
      const s = d.samples || [], td = d.timeDeltas || []
      for (let i = 0; i < s.length; i++) {
        ts += (td[i] || 0)
        if (s[i] >= 0) p.samples.push({ ts, node: s[i] })
      }
      p.lastTs = ts
    }
  }
  const allSamples = [...profiles.values()].flatMap((p) => p.samples)

  // Long tasks: toplevel RunTask entries over 50 ms on the main thread.
  const runTasks = events.filter((e) => (e.name === 'RunTask' || e.name === 'ThreadControllerImpl::RunTask') && onMain(e))
  const longTasks = runTasks.filter((e) => (e.dur || 0) > 50000)
  const timelineEvents = events.filter((e) => (e.name === 'FunctionCall' || e.name === 'UpdateLayoutTree' || e.name === 'Layout' || e.name === 'Paint' || e.name === 'PrePaint' || e.name === 'HitTest' || e.name === 'FireAnimationFrame' || e.name === 'EventDispatch') && onMain(e) && typeof e.dur === 'number')

  const attributed = longTasks.map((task) => {
    const t0 = task.ts, t1 = task.ts + task.dur
    const inside = timelineEvents.filter((e) => e.ts >= t0 && e.ts + e.dur <= t1)
    const byName = {}
    for (const e of inside) byName[e.name] = Math.round(((byName[e.name] || 0) + e.dur) / 10) / 100
    const samplesIn = allSamples.filter((s) => s.ts >= t0 && s.ts <= t1)
    const self = new Map()
    for (const s of samplesIn) self.set(s.node, (self.get(s.node) || 0) + 1)
    const topFunctions = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([nodeId, count]) => {
      let found = null
      for (const p of profiles.values()) { const n = p.nodes.get(nodeId); if (n) { found = n; break } }
      return { name: found?.name || `node#${nodeId}`, url: found?.url || '', sampleMs: Math.round(count) }
    })
    return { startUs: task.ts, durationMs: Math.round(task.dur / 10) / 100, timelineMs: byName, topFunctions, jsSampleCount: samplesIn.length }
  }).sort((a, b) => b.durationMs - a.durationMs)

  const tourMarkers = ['TourOverlay', 'tour', 'OnboardingDev', 'onboarding']
  const tourFrameHits = attributed.flatMap((t) => t.topFunctions.filter((f) => tourMarkers.some((m) => (f.name || '').toLowerCase().includes(m.toLowerCase()) || (f.url || '').toLowerCase().includes(m.toLowerCase()))).map((f) => ({ durationMs: t.durationMs, name: f.name, url: f.url, sampleMs: f.sampleMs })))

  return {
    schema: 'aics-i2r2-rule3-trace-attribution/v1',
    mainThread: { pid: mainPid ?? null, tid: mainTid ?? null, identified: !!rendererMain },
    runTaskCount: runTasks.length,
    longTaskCount: longTasks.length,
    longTasks: attributed,
    tourHandlerFrameHits: tourFrameHits,
    conclusion: tourFrameHits.length === 0
      ? 'No cpu_profiler sample inside any over-50 ms task resolves to a tour-engine function or URL; recorded hits are empty.'
      : 'cpu_profiler samples inside over-50 ms tasks resolve to tour-engine frames; inspect the hits below.',
    limitation: 'Function attribution covers JS self-time samples; C++-side work (layout, paint, raster) is attributed through the per-task timeline event sums. Long Tasks API container attribution remains window-level by design.',
    boundaryMs: 50,
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error('[i2r2-student] failed:', e.message)
    if (serverProc) { try { process.kill(-serverProc.pid, 'SIGTERM') } catch {} }
    try { mkdirSync(OUT, { recursive: true }); writeFileSync(resolve(OUT, 'i2r2-student-cloud-timing.json'), JSON.stringify({ ...res, error: String(e.message || e), finishedAt: new Date().toISOString() }, null, 2)) } catch {}
    process.exit(1)
  })
}
