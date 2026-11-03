// Student-production A1 scope approved by the owner on 2026-11-03.
// Distinct producer/schema. It never inherits a historical producer identity.
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, mkdtempSync } from 'node:fs'
import { resolve, relative, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { setTimeout as sleep } from 'node:timers/promises'
import { randomUUID } from 'node:crypto'
import { repo, git, sha256, exportSource, localEnv } from './isolated-source.mjs'
import { accountPreflight } from './account-preflight.mjs'
import { startOwned, cleanupOwned, requireFreePort, assertListenerOwner, ownedFetch, launchOwnedBrowser } from './10-perf.mjs'
import { measureAdvance } from './settle-timing.mjs'

if (process.argv.length !== 2 || process.execArgv.length || process.env.NODE_OPTIONS || process.env.BUN_OPTIONS) throw new Error('Unsupported invocation; values not recorded')
const out = resolve(process.env.GATE_EVID, 'prod-smoke')
if (existsSync(out)) throw new Error('Fresh A1 evidence directory required')
mkdirSync(out, { recursive: true })
const baseline = readFileSync(resolve(process.env.GATE_EVID, 'baseline-sha.txt'), 'utf8').trim()
if (!/^[a-f0-9]{40}$/.test(baseline) || git(['cat-file', '-t', baseline]).trim() !== 'commit') throw new Error('Pinned baseline required before A1 launch')
writeFileSync(resolve(out, 'baseline-sha.txt'), baseline + '\n')
const sourceDir = resolve(mkdtempSync(resolve(tmpdir(), 'aics-student-a1-')), 'source')
const port = 4320, origin = `http://127.0.0.1:${port}`
const markers = ['dev-tour-launcher', 'dev-tour-board', 'board-late-target', 'board-volatile-target', 'board-never-present', 'remove-volatile-target', 'FabricateOnboardingDev', 'onboarding board', ...Array.from({ length: 8 }, (_, n) => `Synthetic ${n + 1}:`)]
const historicalMarkers = ['TourOverlay', 'data-tour-overlay', 'data-tour-card', 'data-tour-spotlight', 'dev-tour-launcher', 'Guided tour completed.', 'FabricateOnboardingDev', 'onboarding board', 'remove-volatile-target']
const producerNames = ['student-prod-smoke.mjs', 'isolated-source.mjs', 'isolated-build.mjs', 'student-a1-observer.mjs', 'account-preflight.mjs', '10-perf.mjs', 'owned-browser-task.mjs', 'settle-timing.mjs', 'lib.mjs']
const producer = producerNames.sort().map(name => ({ name, sha256: sha256(readFileSync(resolve(import.meta.dirname, name))) }))
mkdirSync(resolve(out, 'producer'))
for (const f of producer) writeFileSync(resolve(out, 'producer', f.name), readFileSync(resolve(import.meta.dirname, f.name)))
const integrity = () => ({ branch: git(['branch', '--show-current']).trim(), head: git(['rev-parse', 'HEAD']).trim(), nextEnvSHA256: sha256(readFileSync(resolve(repo, 'next-env.d.ts'))), diffSHA256: sha256(git(['diff', '--binary', 'HEAD'], 'buffer')), worktrees: git(['worktree', 'list', '--porcelain']) })
const result = { schema: 'aics-student-a1/v3', criterion: 'owner-approved-student-production-2026-11-03', baseline, runId: randomUUID(), workerPid: process.pid, startedAt: new Date().toISOString(), invocation: { executable: process.execPath, argv: process.argv, execArgv: process.execArgv, version: process.version }, producer, producerFingerprint: sha256(JSON.stringify(producer)), sourceDir, integrity: { before: integrity() }, assertions: [], observations: { blockedExternal: 0, blockedMutations: 0, simulatedProgressWrites: 0 } }
writeFileSync(resolve(out, 'execution.json'), JSON.stringify({ schema: 'aics-student-a1-execution/v1', runId: result.runId, capturedAt: result.startedAt, baseline, head: result.integrity.before.head, invocation: result.invocation, producer, producerFingerprint: result.producerFingerprint, environment: { NODE_ENV: 'production', APP_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:27017/aics_portal?directConnection=true', MONGODB_DB: 'aics_portal', serverOrigin: origin, browserPort: Number(process.env.GATE_CDP_PORT || 4311) }, secrets: 'No cookies, credentials, AUTH_SECRET or unrestricted environment values recorded' }, null, 2))
const assert = (id, ok, detail) => { result.assertions.push({ id, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${id}`); if (!ok) throw new Error(id) }
let context
try {
  requireFreePort(port); requireFreePort(Number(process.env.GATE_CDP_PORT || 4311))
  result.observations.accountPreflight = await accountPreflight()
  const a = result.observations.accountPreflight
  assert('account-preflight', a.unique && a.role === 'student' && a.branch === 'commonwealth' && a.modernHash && a.credentialMatches && a.writesAttempted === 0)
  result.source = exportSource(sourceDir)
  assert('committed-source', result.source.exportBytesVerified && result.source.exported.every(f => !f.differsFromHead))
  const env = { ...localEnv(), A1_STATIC_GATES: '1' }
  await startOwned('a1', 'production-build', process.execPath, [resolve(import.meta.dirname, 'isolated-build.mjs'), sourceDir, out], sourceDir, env)
  const deadline = Date.now() + 15 * 60 * 1000
  while (!existsSync(resolve(out, 'build-result.json')) && Date.now() < deadline) await sleep(500)
  assert('build-result-present', existsSync(resolve(out, 'build-result.json')))
  result.observations.build = JSON.parse(readFileSync(resolve(out, 'build-result.json')))
  result.observations.quality = JSON.parse(readFileSync(resolve(out, 'quality-result.json')))
  assert('production-build', result.observations.build.exitCode === 0 && result.observations.build.signal === null)
  assert('static-gates', result.observations.quality.every(c => c.exitCode === 0) && result.observations.quality.length === 3)
  const scan = { markers, historicalMarkers, hits: [], historicalHits: [], chunks: [], totalClientChunkFiles: 0, totalBytesScanned: 0, limitation: 'Targeted marker scan, not exhaustive proof of zero related bytes or modules. Historical engine hits are retained and permitted only by the explicit student-production amendment.' }
  const walk = dir => { for (const f of readdirSync(dir, { withFileTypes: true })) { const path = resolve(dir, f.name); if (f.isDirectory()) walk(path); else { const bytes = readFileSync(path), text = bytes.toString('utf8'), name = relative(sourceDir, path).replaceAll('\\', '/'), artifact = 'client-chunks/' + relative(resolve(sourceDir, '.next/static/chunks'), path).replaceAll('\\', '/'); mkdirSync(dirname(resolve(out, artifact)), { recursive: true }); writeFileSync(resolve(out, artifact), bytes); scan.totalClientChunkFiles++; scan.totalBytesScanned += bytes.length; scan.chunks.push({ file: name, artifact, bytes: bytes.length, sha256: sha256(bytes) }); for (const marker of markers) if (text.includes(marker)) scan.hits.push({ file: name, marker }); for (const marker of historicalMarkers) if (text.includes(marker)) scan.historicalHits.push({ file: name, marker }) } } }
  walk(resolve(sourceDir, '.next/static/chunks'))
  writeFileSync(resolve(out, 'chunk-scan.json'), JSON.stringify(scan, null, 2)); result.observations.scan = scan
  assert('targeted-synthetic-marker-scan', scan.totalClientChunkFiles > 0 && scan.hits.length === 0)
  const server = await startOwned('a1', 'production-server', process.execPath, [resolve(sourceDir, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], sourceDir, env)
  let ready = false
  for (let n = 0; n < 60; n++) { if (await assertListenerOwner(server, port, true)) { try { ready = (await ownedFetch(server, port, origin + '/', { signal: AbortSignal.timeout(5000) })).ok } catch (e) { if (e.code !== 'OWNED_HTTP_RETRY') throw e } if (ready) break } await sleep(500) }
  result.observations.server = { ready, ownedListener: ready, port, origin }; assert('owned-production-server', ready)
  result.observations.demoStatus = (await ownedFetch(server, port, origin + '/api/auth/demo', { method: 'POST', signal: AbortSignal.timeout(10000) })).status
  assert('demo-route-disabled', result.observations.demoStatus === 404)
  const login = await ownedFetch(server, port, origin + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'juan.santos', password: 'student123' }), signal: AbortSignal.timeout(15000) })
  const cookie = login.headers.getSetCookie().join('\n').match(/aics_session=([^;]+)/)?.[1], body = await login.json()
  result.observations.login = { status: login.status, cookieIssued: !!cookie, username: body.user?.username ?? body.username, role: body.user?.role ?? body.role, branch: body.user?.branch ?? body.branch }
  assert('real-production-login', login.status === 200 && !!cookie && result.observations.login.username === 'juan.santos' && result.observations.login.role === 'student' && result.observations.login.branch === 'commonwealth')
  const browser = await launchOwnedBrowser('a1', out)
  context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
  await context.addCookies([{ name: 'aics_session', value: cookie, url: origin }])
  await context.addInitScript(() => localStorage.setItem('aics_cookie_consent', 'essential'))
  const fixture = { values: { password: false, profile: false, photo: false, tour: false, announcements: false }, preferences: { welcomeSeen: false, checklistDismissed: false, tourSkipped: false, tasksGuideSeen: false, tasksGuideCompleted: false } }
  let routeError = null
  await context.route('**/*', async route => { const req = route.request(), u = new URL(req.url()); if (u.origin !== origin) { result.observations.blockedExternal++; return route.abort() } try { await assertListenerOwner(server, port); if (u.pathname === '/api/onboarding/state' && ['GET', 'PATCH'].includes(req.method())) { if (req.method() === 'PATCH') { const input = req.postDataJSON(); Object.assign(fixture.values, input.updates); Object.assign(fixture.preferences, input.preferences); result.observations.simulatedProgressWrites++ } return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, role: 'student', version: 1, persisted: true, ...fixture }) }) } if (!['GET', 'HEAD'].includes(req.method())) { result.observations.blockedMutations++; return route.abort() } await route.continue() } catch (e) { routeError = e.message; await route.abort() } })
  const page = await context.newPage()
  await page.goto(origin + '/portal/commonwealth/student/juan.santos', { waitUntil: 'load', timeout: 60000 })
  await page.getByRole('heading', { name: 'Welcome to AICS, Juan.' }).waitFor({ timeout: 30000 })
  result.observations.dom = await page.evaluate(() => ({ launcher: !!document.querySelector('[data-tour="dev-tour-launcher"]'), board: !!document.querySelector('[data-testid="dev-tour-board"]'), removeTarget: !!document.querySelector('[data-tour="remove-volatile-target"]'), navOk: !!document.querySelector('[data-tour="nav-dashboard"]') }))
  assert('synthetic-controls-absent', !result.observations.dom.launcher && !result.observations.dom.board && !result.observations.dom.removeTarget && result.observations.dom.navOk)
  await page.getByRole('button', { name: 'Show me around', exact: true }).click()
  const ids = ['student-overview', 'student-announcements', 'student-academics', 'student-tasks', 'student-events', 'student-account', 'student-help']
  const toured = []
  for (const id of ids) {
    await page.waitForFunction(id => { const e = document.querySelector('[data-tour-overlay]'); return e?.dataset.stepId === id && e.dataset.disposition === 'spot' }, id); toured.push(id)
    if (id === 'student-help') {
      const saved = page.waitForResponse(response => { const req = response.request(); return new URL(req.url()).pathname === '/api/onboarding/state' && req.method() === 'PATCH' && req.postDataJSON()?.updates?.tour === true && response.status() === 200 })
      await Promise.all([saved, page.getByRole('button', { name: 'Finish the guided tour', exact: true }).click()])
    } else await page.getByRole('button', { name: 'Go to the next tour step', exact: true }).click()
  }
  await page.locator('[data-tour-overlay]').waitFor({ state: 'detached' })
  result.observations.studentTour = { steps: toured, completedInFixture: fixture.values.tour, otherValuesUnchanged: Object.entries(fixture.values).filter(([key]) => key !== 'tour').every(([, value]) => value === false) }
  assert('real-student-tour', toured.length === 7 && fixture.values.tour && result.observations.studentTour.otherValuesUnchanged)
  await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click(); await page.locator('[data-tour-overlay]').waitFor(); await page.keyboard.press('Escape'); await page.locator('[data-tour-overlay]').waitFor({ state: 'detached' })
  result.observations.replayPreserved = fixture.values.tour; assert('replay-preserves-progress', fixture.values.tour)
  await page.locator('[data-tour="nav-academics"]:visible').click(); await page.waitForURL('**/academics')
  result.observations.navigation = { pathname: new URL(page.url()).pathname, academicsReached: page.url().endsWith('/academics') }; assert('production-navigation', result.observations.navigation.academicsReached)
  await page.screenshot({ path: resolve(out, 'production.png') })
  result.observations.routeError = routeError; assert('request-safety', !routeError && result.observations.blockedMutations === 0)
  // Real-student timing is recorded separately from synthetic deliberate waits.
  const runs = []
  for (let run = 1; run <= 3; run++) {
    const cycles = []
    for (let cycle = 0; cycle <= 3; cycle++) {
      await page.locator('[data-tour="nav-help"]:visible').click(); await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click()
      await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.stepId === 'student-overview' && document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot')
      const samples = []
      for (let advance = 0; advance < 7; advance++) { samples.push(await measureAdvance(page, { completionTarget: 'student-tour-replay' })); await page.waitForTimeout(200) }
      cycles.push({ discardedWarmup: cycle === 0, samples })
    }
    const values = cycles.slice(1).flatMap(c => c.samples.map(s => s.ms)).sort((a, b) => a - b)
    runs.push({ run, cycles, n: values.length, p95: values[Math.ceil(values.length * .95) - 1] })
  }
  result.performance = { rule2: { limitMs: 100, provisional: true, runs, status: runs.every(r => r.n >= 20 && r.p95 <= 100) ? 'PASS' : 'FAIL', definition: 'Click to resolved new spotlight settled, including route/data waits. One whole warm-up tour discarded per run. Finish requires the real Help replay entry.' } }
  await page.locator('[data-tour="nav-help"]:visible').click(); await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[data-tour-overlay]')?.dataset.disposition === 'spot')
  const supported = await page.evaluate(() => {
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return false
    window.__studentGateLongTasks = []
    window.__studentGateObserver = new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__studentGateLongTasks.push({ startTime: entry.startTime, duration: entry.duration, attribution: entry.attribution.map(a => ({ name: a.name, containerType: a.containerType })) }) })
    window.__studentGateObserver.observe({ type: 'longtask', buffered: false }); return true
  })
  for (const width of [1100, 1024, 900, 800, 700, 390, 800, 1280]) { await page.setViewportSize({ width, height: 700 }); await page.waitForTimeout(150) }
  for (const delta of [400, -400]) for (let n = 0; n < 8; n++) { await page.mouse.wheel(0, delta); await page.waitForTimeout(100) }
  await page.waitForTimeout(400)
  const tasks = await page.evaluate(() => { window.__studentGateObserver?.disconnect(); return window.__studentGateLongTasks || [] })
  result.performance.rule3 = { status: supported && tasks.every(t => t.duration <= 50) ? 'PASS' : 'INCONCLUSIVE', supported, tasks, limitation: 'Long Tasks API does not identify tour-handler ownership. Any over-limit entry requires further attribution; none is silently assigned to or excluded from onboarding.' }
  await page.keyboard.press('Escape')
  writeFileSync(resolve(out, 'student-performance.json'), JSON.stringify(result.performance, null, 2))
  result.exitCode = 0
} catch (error) { result.exitCode = 1; result.error = error.message; console.error(error.message) }
finally {
  if (context) try { await context.close() } catch { result.exitCode = 1; result.contextCloseFailed = true }
  result.cleanup = await cleanupOwned('a1')
  let preserved = false
  try { result.integrity.after = integrity(); preserved = JSON.stringify(result.integrity.before) === JSON.stringify(result.integrity.after) } catch { result.integrity.error = 'Repository integrity not reverified' }
  result.assertions.push({ id: 'repository-integrity', ok: preserved }, { id: 'owned-process-cleanup', ok: result.cleanup.errors.length === 0 })
  const producerUnchanged = producer.every(f => f.sha256 === sha256(readFileSync(resolve(import.meta.dirname, f.name))))
  result.assertions.push({ id: 'producer-unchanged', ok: producerUnchanged })
  if (!preserved || !producerUnchanged || result.cleanup.errors.length) result.exitCode = 1
  result.finishedAt = new Date().toISOString(); writeFileSync(resolve(out, 'result.json'), JSON.stringify(result, null, 2))
  writeFileSync(resolve(out, 'manifest.txt'), [`timestamp: ${result.finishedAt}`, `baseline SHA: ${baseline}`, `HEAD SHA: ${result.integrity.before.head}`, `actual worker command argv: ${JSON.stringify(result.invocation.argv)}`, `runtime: ${result.invocation.executable} ${result.invocation.version}`, `producer fingerprint: ${result.producerFingerprint}`, 'scope: owner-approved student production; compiled source comes from Git blobs, progress is simulated, no application mutation except the approved synthetic login', 'compiler: webpack production, normal minification; default Turbopack not executed', 'marker scan: targeted, not exhaustive zero-byte/module proof', `exit: ${result.exitCode}`].join('\n') + '\n')
  console.log(`Student A1 exit=${result.exitCode}; evidence=${out}`); process.exitCode = result.exitCode
}
