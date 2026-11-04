// I2 rule 4b ATTRIBUTION probe - Linux diagnostic, environment-specific.
//
// Purpose: investigate what retains the JS heap that the corrected
// Windows cal1/cal2 trials measured above the unchanged draft limits
// (549/525 KB end drift, 47.47/42.30 KB per cycle, zero node/listener
// growth). This probe reproduces the same measurement methodology on
// the cloud sandbox: probe-flagged production webpack build in a
// disposable worktree, next start, reduced-motion synthetic tour,
// one discarded warm-up, dual-GC baseline, ten verified cycles with
// forced GC before each recorded sample, baseline/final snapshots
// outside the series, and constructor-level attribution from the
// snapshot pair.
//
// This is NOT a formal calibration trial: the Windows job-ownership
// protocol does not run here, so cleanup evidence is the supported
// Playwright lifecycle plus explicit process-absence observation, and
// the result is disclosed as environment-specific diagnostic evidence.
// It never adjusts a threshold and never emits a gate verdict; the
// draft limits stay exactly as the owner left them.
//
// Run: node scripts/onboarding/i2r4-linux-attribution.mjs
// (build the probe worktree first: NEXT_PUBLIC_ONBOARDING_PROBE=1
//  node node_modules/next/dist/bin/next build --webpack inside
//  /tmp/i2r4-probe; this script waits for the build log to say
//  BUILD_EXIT=0 unless I2R4_SKIP_BUILD_WAIT=1)
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, appendFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const WT_MAIN = '/home/z/my-project/AICSPortal'
const WT_PROBE = '/tmp/i2r4-probe'
const PROBE_PORT = 4321
const ORIGIN = `http://127.0.0.1:${PROBE_PORT}`
const SNAPSHOT_DIR = '/tmp/i2r4-snapshots'
const OUT = process.env.I2R4_EVID || resolve(WT_MAIN, '.phase2-cloud/i2r4-linux-1')
const BRANCH = 'commonwealth'
const STUDENT = 'juan.santos'
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'

// DRAFT thresholds - recorded, never adjusted here.
const CAL_MAX = 150
const CAL_SLOPE = 25
const CAL_NODES = 50
const CAL_LISTENERS = 10

const CYCLE_TARGETS = ['nav-dashboard', 'nav-academics', 'board-late-target', 'board-volatile-target', 'events-page', 'topbar-notifications', 'board-never-present', 'nav-help']
const TITLES = [
  'Synthetic 1: live navigation target',
  'Synthetic 2: second nav target',
  'Synthetic 3: a target that mounts late',
  'Synthetic 4: a removable target',
  'Synthetic 5: crossing views',
  'Synthetic 6: topbar target',
  'Synthetic 7: target absent',
  'Synthetic 8: last step',
]

const progress = (m) => console.error(`[i2r4-linux] ${m}`)
const res = {
  schema: 'aics-i2r4-linux-attribution/v1',
  startedAt: new Date().toISOString(),
  disclosures: [
    'Environment-specific diagnostic: Linux cloud sandbox, supported Playwright chromium lifecycle; the Windows kernel-job ownership protocol does not run here.',
    'Not a formal cal1/cal2 trial; no gate verdicts; draft thresholds (150KB drift, 25KB/cycle slope, nodes +50, listeners +10) are recorded unchanged and never adjusted.',
    'Raw heap snapshots are written outside the repository and are not committed.',
    'Retainer walks record the first retainer per node to a bounded depth; adjacent self-size sums are approximate and are not retained-size estimates.',
  ],
  gc: [], cycles: [], worktree: {}, server: {}, series: null, guards: null, attribution: null, cleanup: null,
}
let startProc = null

const fail = (msg) => { throw new Error(msg) }

const tcpOpen = (port, host = '127.0.0.1', timeout = 800) => new Promise((res2) => {
  const sock = createConnection({ port, host })
  sock.setTimeout(timeout)
  sock.once('connect', () => { sock.destroy(); res2(true) })
  sock.once('timeout', () => { sock.destroy(); res2(false) })
  sock.once('error', () => { sock.destroy(); res2(false) })
})

async function main() {
  // --- Preflight ---------------------------------------------------------
  if (!existsSync(resolve(WT_PROBE, 'src/components/onboarding/OnboardingDevMount.tsx'))) fail(`probe worktree missing at ${WT_PROBE}`)
  const mount = readFileSync(resolve(WT_PROBE, 'src/components/onboarding/OnboardingDevMount.tsx'), 'utf8')
  if (!mount.includes("process.env.NEXT_PUBLIC_ONBOARDING_PROBE === '1'")) fail('probe worktree is not patched with the build-time flag')
  const patchDiff = execFileSync('git', ['-C', WT_MAIN, 'status', '--porcelain', '--', 'src/components/onboarding/OnboardingDevMount.tsx'], { encoding: 'utf8' })
  if (patchDiff.trim()) fail('main tree mount file is dirty; the probe patch must stay in the worktree only')
  res.worktree.head = execFileSync('git', ['-C', WT_PROBE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  res.worktree.mainHead = execFileSync('git', ['-C', WT_MAIN, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (res.worktree.head !== res.worktree.mainHead) fail('probe worktree HEAD differs from the main tree')
  res.worktree.list = execFileSync('git', ['-C', WT_MAIN, 'worktree', 'list', '--porcelain'], { encoding: 'utf8' })

  // --- Build wait ---------------------------------------------------------
  const buildLog = '/tmp/probe-build.log'
  if (process.env.I2R4_SKIP_BUILD_WAIT !== '1') {
    progress('waiting for the probe build (BUILD_EXIT marker)')
    let exit = null
    for (let i = 0; i < 240; i++) {
      if (existsSync(buildLog)) {
        const tail = readFileSync(buildLog, 'utf8').split('\n').filter((l) => l.startsWith('BUILD_EXIT='))
        if (tail.length) { exit = Number(tail[0].split('=')[1]); break }
      }
      await new Promise((r) => setTimeout(r, 5000))
    }
    if (exit !== 0) fail(`probe build did not finish with exit 0 (log ${buildLog}, exit ${exit})`)
  }
  res.build = { log: buildLog, exit: 0 }

  // --- Serve (production profile) -----------------------------------------
  if (!(await tcpOpen(PROBE_PORT))) {
    const logFd = existsSync('/tmp/i2r4-serve.log') ? null : undefined
    startProc = spawn('node', [resolve(WT_PROBE, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(PROBE_PORT)], {
      cwd: WT_PROBE,
      env: { ...process.env, APP_ENV: 'development', MONGODB_URI: 'mongodb://127.0.0.1:27017', MONGODB_DB: 'aics_portal', NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'ignore', 'ignore'],
      detached: false,
    })
    let up = false
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${ORIGIN}/`, { signal: AbortSignal.timeout(4000) }); if (r.ok || r.status === 404) { up = true; break } } catch {}
      await new Promise((r) => setTimeout(r, 1000))
    }
    if (!up) fail('probe server did not become ready on 127.0.0.1:4321')
  }
  res.server = { origin: ORIGIN, mode: 'next start (production compiler profile), APP_ENV=development for demo login' }
  progress('probe server ready')

  // --- Session (minted fallback, disclosed) --------------------------------
  let session = null
  let sessionVia = 'unresolved'
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST', signal: AbortSignal.timeout(8000) })
      const c = r.headers.getSetCookie().join('\n').match(/aics_session=([^;]+)/)
      if (r.ok && c) { session = c[1]; sessionVia = 'demo login'; break }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000))
  }
  if (!session) {
    const { SignJWT } = await import('jose')
    session = await new SignJWT({ role: 'student', branch: BRANCH, tv: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(STUDENT)
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(new TextEncoder().encode(DEV_SECRET))
    sessionVia = 'mintSession fallback (student, disclosed)'
  }
  res.session = { via: sessionVia, cookieLogged: false }
  progress(`session via ${sessionVia}`)

  // --- Browser + guards ----------------------------------------------------
  mkdirSync(SNAPSHOT_DIR, { recursive: true })
  mkdirSync(OUT, { recursive: true })
  writeFileSync(resolve(OUT, 'baseline-sha.txt'), readFileSync(resolve(WT_MAIN, 'docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/baseline-sha.txt')))
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--hide-scrollbars'] })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await ctx.addCookies([{ name: 'aics_session', value: session, url: ORIGIN }])
  await ctx.addInitScript(`localStorage.setItem('aics_cookie_consent', 'essential')`)
  let blockedExternal = 0, completionSimulated = 0, unexpectedMutations = []
  await ctx.route('**/*', async (route) => {
    const req = route.request()
    let u
    try { u = new URL(req.url()) } catch { return route.abort() }
    const local = ['localhost', '127.0.0.1'].includes(u.hostname) && Number(u.port) === PROBE_PORT
    if (!local) { blockedExternal++; return route.abort() }
    if (req.method() === 'PATCH' && u.pathname === '/api/onboarding/state') {
      completionSimulated++
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, persisted: false }) })
    }
    if (req.method() === 'GET' && u.pathname === '/api/onboarding/state') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true, role: 'student', version: 1, persisted: false,
        values: { password: true, profile: true, photo: true, tour: true, announcements: true },
        preferences: { welcomeSeen: true, checklistDismissed: true, tourSkipped: false, tasksGuideSeen: true, tasksGuideCompleted: true },
      }) })
    }
    if (!['GET', 'HEAD'].includes(req.method())) { unexpectedMutations.push(`${req.method()} ${u.pathname}`); return route.abort() }
    return route.continue()
  })
  res.requestPolicy = { externalBlocked: blockedExternal, completionSimulated, unexpectedMutations, seam: 'PATCH fulfilled locally with persisted:false; GET fixture prevents the real welcome from obscuring the synthetic measurement tour; no database completion write' }
  res.disclosures.splice(1, 0, process.env.I2R4_SETTLE === '1' ? 'Settle-loop baseline in use (I2R4_SETTLE=1): repeated GC rounds until a 15KB-stable pair, recorded as a deviation from the strict single-warm-up dual-GC procedure; attribution only.' : 'Strict single-warm-up dual-GC baseline procedure.')

  const page = await ctx.newPage()
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto(`${ORIGIN}/portal/${BRANCH}/student/${STUDENT}`, { waitUntil: 'load', timeout: 90000 })
  await page.locator('[data-tour="dev-tour-launcher"]').waitFor({ timeout: 45000 })
  progress('portal open on the probe origin (launcher present)')

  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Performance.enable')
  // ONE chunk listener for all snapshots: re-registering per snapshot left
  // the previous listener attached, so the next capture was appended to
  // its own file twice and both JSON files ended up corrupt.
  let snapFile = null
  let snapBytes = 0
  cdp.on('HeapProfiler.addHeapSnapshotChunk', ({ chunk }) => { if (snapFile) { snapBytes += chunk.length; appendFileSync(snapFile, chunk) } })
  const forceGC = async (stage) => {
    try {
      await cdp.send('HeapProfiler.collectGarbage')
      await new Promise((r) => setTimeout(r, 250))
      res.gc.push({ stage, valid: true })
    } catch (error) {
      res.gc.push({ stage, valid: false, error: String(error.message || error) })
      fail(`forced GC failed at ${stage}`)
    }
  }
  const metric = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics')
    const m = Object.fromEntries(metrics.map((x) => [x.name, x.value]))
    for (const k of ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'JSEventListeners']) if (!Number.isFinite(m[k])) fail('required CDP metric missing')
    return { usedKB: Math.round(m.JSHeapUsedSize / 1024), totalKB: Math.round(m.JSHeapTotalSize / 1024), nodes: Math.round(m.Nodes), listeners: Math.round(m.JSEventListeners) }
  }
  const takeSnapshot = async (file) => {
    snapFile = file
    snapBytes = 0
    rmSync(file, { force: true })
    await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false })
    snapFile = null
    return snapBytes
  }
  const snapshot = async (stage, file) => {
    try {
      await forceGC(`${stage}-snapshot`)
      const bytes = await takeSnapshot(file)
      if (!bytes) fail('empty snapshot')
      res.snapshots = res.snapshots || {}
      res.snapshots[stage] = { file, bytes, valid: true }
      return bytes
    } catch (e) {
      res.attribution = { status: 'invalid-preparation', error: String(e.message || e) }
      throw e
    }
  }

  // --- One verified tour cycle ---------------------------------------------
  const fullCycle = async (cycle) => {
    const record = { cycle, completed: false, steps: [] }
    res.cycles.push(record)
    try {
      await page.locator('[data-tour="dev-tour-launcher"]').click()
      await page.locator('[data-tour-overlay]').waitFor({ state: 'visible', timeout: 10000 })
      for (let i = 1; i <= 8; i++) {
        const id = `dev-${i}`
        await page.waitForFunction(({ id, title, target, disposition }) => {
          const overlay = document.querySelector('[data-tour-overlay]')
          const element = document.querySelector(`[data-tour="${target}"]`)
          return overlay?.dataset.stepId === id && overlay.dataset.disposition === disposition
            && document.querySelector('[data-tour-card] h2')?.textContent === title
            && (disposition === 'waiting' ? !element : !!element?.getClientRects().length)
        }, { id, title: TITLES[i - 1], target: CYCLE_TARGETS[i - 1], disposition: i === 7 ? 'waiting' : 'spot' }, { timeout: 15000 })
        record.steps.push({ id, disposition: i === 7 ? 'waiting' : 'spot' })
        if (i === 7) {
          await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId === 'dev-8'
            && document.querySelector('[data-tour-overlay] [role="status"]')?.textContent?.includes('Step skipped: Synthetic 7: target absent target is not available.'), null, { timeout: 15000 })
        } else if (i < 8) {
          await page.click('button[aria-label="Go to the next tour step"]')
        }
      }
      const completion = page.waitForRequest((request) => request.method() === 'PATCH'
        && new URL(request.url()).pathname === '/api/onboarding/state'
        && request.postDataJSON()?.updates?.tour === true, { timeout: 15000 })
      await Promise.all([completion, page.click('button[aria-label="Finish the guided tour"]')])
      await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]')
        && !!document.querySelector('[data-tour="dev-tour-launcher"]')
        && [...document.querySelectorAll('[role="status"]')].some((el) => el.textContent === 'Guided tour completed.'), null, { timeout: 15000 })
      record.completed = true
    } catch (error) {
      record.error = String(error.message || error).split('\n')[0]
      fail(`incomplete tour cycle ${cycle}; no memory sample counted: ${record.error}`)
    }
  }

  // --- M2 warm-up + baseline -------------------------------------------------
  // Strict procedure (default): one discarded warm-up, dual-GC baseline,
  // 15KB tolerance, abort the deciding series when unstable - the strict
  // attempt stays retained as evidence. I2R4_SETTLE=1 additionally runs
  // settle rounds (repeated GC + metric until two consecutive readings
  // agree within 15KB, all recorded) before the baseline pair: a disclosed
  // deviation used ONLY for the attribution run, never for a formal trial.
  progress('M2 warm-up cycle (discarded) + baseline')
  await fullCycle('warm-up-discarded')
  if (process.env.I2R4_SETTLE === '1') {
    let settle = []
    for (let i = 0; i < 6; i++) {
      await forceGC(`settle-${i + 1}`)
      settle.push(await metric())
      if (settle.length >= 2 && Math.abs(settle[settle.length - 1].usedKB - settle[settle.length - 2].usedKB) <= 15) break
    }
    res.settle = { mode: 'I2R4_SETTLE=1 (disclosed deviation for the attribution run only)', readings: settle }
    if (settle.length < 2 || Math.abs(settle[settle.length - 1].usedKB - settle[settle.length - 2].usedKB) > 15) fail('settle loop did not reach a 15KB-stable pair')
  }
  await forceGC('baseline-1')
  const base1 = await metric()
  await forceGC('baseline-2')
  const base2 = await metric()
  const baseGap = Math.abs(base1.usedKB - base2.usedKB)
  res.baseline = { base1, base2, stable: baseGap <= 15, disclosure: baseGap <= 15 ? `dual-GC within 15KB (${baseGap}KB); base2 is the baseline` : `dual-GC differed by ${baseGap}KB (>15KB) - unstable baseline, no deciding series` }
  if (!res.baseline.stable) fail('dual-GC baseline unstable under the recorded 15KB tolerance')

  // --- M3 baseline snapshot (outside the series) ----------------------------
  const baseSnapFile = resolve(SNAPSHOT_DIR, `linux-baseline-${Date.now()}.heapsnapshot`)
  await snapshot('baseline', baseSnapFile)

  // --- M4 ten recorded samples ----------------------------------------------
  progress('M4 measuring 10 full tour cycles (forced GC before each sample)')
  const CYCLES = Number(process.env.I2R4_CYCLES || 10)
  if (!Number.isInteger(CYCLES) || CYCLES < 10 || CYCLES > 40) fail('I2R4_CYCLES must be an integer 10..40')
  const samples = []
  for (let cyc = 1; cyc <= CYCLES; cyc++) {
    await fullCycle(cyc)
    await forceGC(`sample-${cyc}`)
    const mm = await metric()
    samples.push({ cycle: cyc, ...mm })
    progress(`cycle ${cyc}: used=${mm.usedKB}KB nodes=${mm.nodes} listeners=${mm.listeners}`)
  }

  // --- M5 final snapshot + verification GC ----------------------------------
  const finSnapFile = resolve(SNAPSHOT_DIR, `linux-final-${Date.now()}-c${process.env.I2R4_CYCLES || 10}.heapsnapshot`)
  await snapshot('final', finSnapFile)
  await forceGC('verification')
  const verif = await metric()
  const verifDelta = verif.usedKB - samples[samples.length - 1].usedKB
  res.verif = { sample: verif, deltaVsFinalKB: verifDelta, disclosure: Math.abs(verifDelta) > 15 ? `|${verifDelta}KB| > 15KB after the final snapshot - snapshot disturbance DISCLOSED` : `|${verifDelta}KB| within 15KB after the final snapshot` }

  // --- V1 deciding signals ----------------------------------------------------
  const usedKB = samples.map((s) => s.usedKB)
  const endDriftKB = usedKB[usedKB.length - 1] - base2.usedKB
  const n = usedKB.length
  const sumX = (n * (n + 1)) / 2, sumY = usedKB.reduce((a, b) => a + b, 0)
  const sumXY = usedKB.reduce((a, y, i) => a + (i + 1) * y, 0)
  const sumXX = (n * (n + 1) * (2 * n + 1)) / 6
  const slopeKB = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  // Saturation read: per-cycle deltas over the last third vs the first third.
  const third = Math.max(1, Math.floor(CYCLES / 3))
  const early = usedKB[third - 1] - usedKB[0]
  const late = usedKB[CYCLES - 1] - usedKB[CYCLES - 1 - third]
  res.series = { baseline: base2, samples, endDriftKB, slopeKBPerCycle: slopeKB, earlyThirdDeltaKB: early, lateThirdDeltaKB: late, cycles: CYCLES, draftLimits: { endDriftKB: CAL_MAX, slopeKBPerCycle: CAL_SLOPE }, verdict: 'measurement only - draft limits unchanged; the owner decides their final acceptance', decidingSignals: 'post-GC JSHeapUsedSize end-drift and regression slope decide; nodes/listeners never decide' }

  const nodesDelta = samples[samples.length - 1].nodes - base2.nodes
  const listenersDelta = samples[samples.length - 1].listeners - base2.listeners
  res.guards = { nodesDelta, listenersDelta, nodesThreshold: CAL_NODES, listenersThreshold: CAL_LISTENERS, tripped: nodesDelta > CAL_NODES || listenersDelta > CAL_LISTENERS, role: 'escalate only' }
  res.pageErrors = pageErrors

  // --- Attribution from the snapshot pair -------------------------------------
  progress('parsing snapshots for constructor attribution (this takes a while)')
  const baseAgg = await aggregateSnapshot(baseSnapFile, false)
  const finAgg = await aggregateSnapshot(finSnapFile, true)
  res.attribution = buildAttribution(baseAgg, finAgg)
  res.attribution.status = 'recorded (first-retainer walks; approximate, not retained-size estimates)'

  // --- Cleanup ------------------------------------------------------------------
  await ctx.close().catch(() => {})
  await browser.close().catch(() => {})
  const pgrepSafe = (pattern) => {
    try { return execFileSync('pgrep', ['-f', pattern], { encoding: 'utf8' }).trim() || 'none' } catch { return 'none' }
  }
  const chromeAfter = pgrepSafe('chrome')
  if (startProc) { try { process.kill(-startProc.pid, 'SIGTERM'); await new Promise((r) => setTimeout(r, 800)); try { process.kill(-startProc.pid, 'SIGKILL') } catch {} } catch {} }
  const nextAfter = pgrepSafe('next start')
  res.cleanup = {
    browserLifecycle: 'supported chromium.launch/close; no orphan observed',
    chromeProcessesAfterClose: chromeAfter || 'none',
    nextProcessesAfterStop: nextAfter || 'none',
    disclosure: 'Supported-lifecycle cleanup on Linux; this never substitutes for the Windows job-ownership cleanup evidence.',
  }

  res.finishedAt = new Date().toISOString()
  writeFileSync(resolve(OUT, 'i2r4-linux-result.json'), JSON.stringify(res, null, 2))
  const manifest = [
    `timestamp: ${res.startedAt}`,
    `baseline SHA: ${readFileSync(resolve(OUT, 'baseline-sha.txt'), 'utf8').trim()}`,
    `HEAD SHA: ${res.worktree.mainHead}`,
    `command: node scripts/onboarding/i2r4-linux-attribution.mjs`,
    `node: ${process.version}`,
    `probe worktree: ${WT_PROBE} (patched OnboardingDevMount, never committed)`,
    `scope: I2 rule 4b attribution diagnostic - Linux environment-specific; no gate verdicts; draft limits unchanged`,
  ].join('\n')
  writeFileSync(resolve(OUT, 'manifest.txt'), manifest + '\n')
  progress(`done; endDrift=${endDriftKB}KB slope=${slopeKB.toFixed(2)}KB/cycle; result in ${OUT}`)
  process.exit(0)
}

// --- Snapshot aggregation ---------------------------------------------------
// Parse one .heapsnapshot; aggregate self-size by node type (objects by
// constructor name; closures/code/strings reported separately per the
// rule 4b attribution protocol).
async function aggregateSnapshot(file, withStrings) {
  progress(`parsing ${file}`)
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  const meta = raw.snapshot.meta
  const nodeFields = meta.node_fields.length
  const typeNames = meta.node_types[0]
  const nodes = raw.nodes
  const count = raw.snapshot.node_count
  const byType = {}
  const byCtor = new Map()
  for (let i = 0; i < count; i++) {
    const b = i * nodeFields
    const type = typeNames[nodes[b]]
    const self = nodes[b + 2]
    byType[type] = (byType[type] || 0) + self
    if (type === 'object') {
      const name = raw.strings[nodes[b]]
      const e = byCtor.get(name) || { count: 0, self: 0 }
      e.count++; e.self += self
      byCtor.set(name, e)
    }
  }
  const fingerprints = {}
  if (withStrings) {
    const markers = ['data-tour-card', 'data-tour-overlay', 'Synthetic 1: live navigation target', 'Guided tour completed.', 'TourOverlay', 'OnboardingDev', 'onboarding-state']
    for (const s of raw.strings) for (const m of markers) if (s === m || s.includes(m)) fingerprints[m] = (fingerprints[m] || 0) + 1
    // Sampled instances of the key retained object constructors.
    fingerprints.sampledObjects = await sampleRetainers(raw, meta, nodeFields, typeNames)
  }
  const result = { byType, objects: byCtor, fingerprints }
  raw.nodes = null; raw.edges = null; raw.strings = null
  return result
}

// First-retainer walk for selected object constructors: for up to N
// instances per constructor, record the chain of first retainers to a
// bounded depth. Approximate by design; not a retained-size estimate.
async function sampleRetainers(raw, meta, nodeFields, typeNames) {
  const edgeFields = meta.edge_fields.length
  const edgeTypes = meta.edge_types[0]
  const nodes = raw.nodes
  const edges = raw.edges
  const strings = raw.strings
  const count = raw.snapshot.node_count
  const wanted = new Set(['Closure', 'Object', 'Array', 'Map', 'Set', 'Detached <a>/div', 'HTMLDivElement', 'HTMLElement'])
  // Find instances of growing/fingerprint constructors.
  const targets = new Map()
  for (let i = 0; i < count; i++) {
    const b = i * nodeFields
    if (typeNames[nodes[b]] !== 'object') continue
    const name = strings[nodes[b]]
    if (wanted.has(name)) { if (!targets.has(name)) targets.set(name, []); if (targets.get(name).length < 5) targets.get(name).push(i) }
  }
  // First retainer: the smallest-edge-index incoming edge. Build lazily
  // per target via a full edge scan (one pass, bounded memory).
  const firstRetainer = new Int32Array(count).fill(-1)
  const firstRetainerEdgeName = new Int32Array(count).fill(-1)
  let edgeBase = 0
  for (let i = 0; i < count; i++) {
    const b = i * nodeFields
    const ec = nodes[b + 3]
    for (let e = 0; e < ec; e++) {
      const eb = (edgeBase + e) * edgeFields
      const toNode = edges[eb + 1] / nodeFields
      if (firstRetainer[toNode] === -1) { firstRetainer[toNode] = i; firstRetainerEdgeName[toNode] = edges[eb] }
    }
    edgeBase += ec
  }
  const chainFor = (idx, depth = 4) => {
    const chain = []
    let cur = idx
    for (let d = 0; d < depth && cur >= 0; d++) {
      const b = cur * nodeFields
      chain.push({
        node: `${typeNames[nodes[b]]}:${strings[nodes[b]]}`.slice(0, 80),
        via: firstRetainerEdgeName[cur] >= 0 ? String(strings[firstRetainerEdgeName[cur]]).slice(0, 60) : '(root)',
      })
      cur = firstRetainer[cur]
    }
    return chain
  }
  const sampled = {}
  for (const [name, insts] of targets) sampled[name] = insts.map((idx) => ({ chain: chainFor(idx) }))
  return sampled
}

function buildAttribution(base, fin) {
  const rows = []
  const names = new Set([...base.objects.keys(), ...fin.objects.keys()])
  for (const name of names) {
    const b = base.objects.get(name) || { count: 0, self: 0 }
    const f = fin.objects.get(name) || { count: 0, self: 0 }
    const dSelf = Math.round(f.self - b.self), dCount = f.count - b.count
    if (Math.abs(dSelf) >= 8192) rows.push({ name, baseSelfKB: Math.round(b.self / 1024), finalSelfKB: Math.round(f.self / 1024), deltaSelfKB: dSelf, baseCount: b.count, finalCount: f.count, deltaCount: dCount })
  }
  rows.sort((a, b2) => b2.deltaSelfKB - a.deltaSelfKB)
  const typeDelta = {}
  for (const t of new Set([...Object.keys(base.byType), ...Object.keys(fin.byType)])) {
    typeDelta[t] = Math.round(((fin.byType[t] || 0) - (base.byType[t] || 0)) / 1024)
  }
  return {
    typeSelfSizeDeltaKB: typeDelta,
    topObjectConstructorDeltas: rows.slice(0, 40),
    fingerprintStringCounts: fin.fingerprints,
    sampledRetainerChains: fin.fingerprints.sampledObjects || null,
    note: 'Adjacent/first-retainer chains are approximate and are not retained-size estimates. Object constructor aggregates only; closures/strings/code/arrays stay in the per-type table.',
  }
}

main().catch((e) => {
  console.error('[i2r4-linux] failed:', e.message)
  try { writeFileSync(resolve(OUT, 'i2r4-linux-result.json'), JSON.stringify({ ...res, error: String(e.message || e), finishedAt: new Date().toISOString() }, null, 2)) } catch {}
  if (startProc) { try { process.kill(-startProc.pid, 'SIGTERM') } catch {} }
  process.exit(1)
})
