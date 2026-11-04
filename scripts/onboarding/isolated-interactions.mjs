// Execute existing interaction assertions with isolated source and owned
// processes. This adapter substitutes infrastructure only; all test source
// and the generated helper are archived for review.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { setTimeout as sleep } from 'node:timers/promises'
import { execFileSync } from 'node:child_process'
import { repo, git, sha256, exportSource, localEnv } from './isolated-source.mjs'
import { accountPreflight } from './account-preflight.mjs'
import { measurePerformance } from './settle-timing.mjs'
import { startOwned, cleanupOwned, requireFreePort, assertListenerOwner, ownedFetch, launchOwnedBrowser } from './10-perf.mjs'

if (process.argv.length !== 2 || process.execArgv.length || process.env.NODE_OPTIONS || process.env.BUN_OPTIONS) {
  throw new Error('Unexpected arguments or implicit runtime options; values were not recorded')
}
const out = resolve(process.env.GATE_EVID || 'docs/done/qa_evidence/ui-ux/onboarding/phase2-completion-interactions')
if (existsSync(out) && readdirSync(out).length) throw new Error('Choose an empty evidence directory')
mkdirSync(out, { recursive: true })
writeFileSync(resolve(out, 'baseline-sha.txt'), readFileSync(resolve(repo, 'docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/baseline-sha.txt')))
const temp = mkdtempSync(resolve(tmpdir(), 'aics-phase2-ui-'))
const sourceDir = resolve(temp, 'source')
const port = 4310, origin = `http://localhost:${port}`
const files = ['01-targets.mjs', '02-positioning.mjs', '03-keyboard.mjs', '04-sr.mjs', '05-motion.mjs', '06-mobile.mjs', '07-themes.mjs', '08-stability.mjs', '09-persistence-safe.mjs', '12-regression.mjs']
const selected = process.env.GATE_SCRIPTS ? process.env.GATE_SCRIPTS.split(',') : files
if (selected.some(f => !files.includes(f)) || new Set(selected).size !== selected.length) throw new Error('Unsupported or duplicate script')
const producerNames = ['isolated-interactions.mjs', 'isolated-source.mjs', 'account-preflight.mjs', 'settle-timing.mjs', '10-perf.mjs', 'owned-browser-task.mjs', 'lib.mjs', ...selected]
const producer = producerNames.sort().map(name => ({ name, sha256: sha256(readFileSync(resolve(import.meta.dirname, name))) }))
mkdirSync(resolve(out, 'producer'))
for (const f of producer) writeFileSync(resolve(out, 'producer', f.name), readFileSync(resolve(import.meta.dirname, f.name)))
const result = { schema: 'aics-phase2-interactions/v1', startedAt: new Date().toISOString(), tests: [],
  invocation: { executable: process.execPath, argv: process.argv, execArgv: process.execArgv, version: process.version },
  producer, producerFingerprint: sha256(JSON.stringify(producer)), selected,
  safety: { externalBlocked: 0, writesBlocked: 0, completionSimulated: 0, errors: [] },
  seam: 'Onboarding PATCH fulfilled locally with persisted:false. No database completion writes; backend failure behavior covered separately by mocked route integration tests.',
  protectedBefore: sha256(readFileSync(resolve(repo, 'next-env.d.ts'))) }
let contextCount = 0
let sharedBrowser
try {
  result.account = await accountPreflight()
  if (!result.account.credentialMatches || !result.account.photoAbsent) throw new Error('Account preflight failed')
  result.source = exportSource(sourceDir)
  // Run static gates in this permitted export, never traverse user-owned files.
  for (const [name, bin, args] of [
    ['lint', 'eslint/bin/eslint.js', ['.']],
    ['typecheck', 'typescript/bin/tsc', ['--noEmit']],
  ]) {
    try {
      const log = execFileSync(process.execPath, [resolve(sourceDir, 'node_modules', bin), ...args], { cwd: sourceDir, env: localEnv('development'), encoding: 'utf8', timeout: 300000, maxBuffer: 5e6, windowsHide: true })
      writeFileSync(resolve(out, name + '.log'), log)
      result[name] = { exitCode: 0 }
    } catch (e) {
      writeFileSync(resolve(out, name + '.log'), String(e.stdout || '') + String(e.stderr || ''))
      result[name] = { exitCode: e.status ?? 1 }
    }
  }
  console.log('Isolated static checks:', JSON.stringify({ lint: result.lint, typecheck: result.typecheck }))
  requireFreePort(port)
  const server = await startOwned('ui-server', 'isolated-next-dev', process.execPath,
    [resolve(sourceDir, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], sourceDir, localEnv('development'))
  let ready = false
  for (let i = 0; i < 90; i++) {
    if (await assertListenerOwner(server, port, true)) {
      try { ready = (await ownedFetch(server, port, origin + '/', { signal: AbortSignal.timeout(10000) })).ok } catch (e) { if (e.code !== 'OWNED_HTTP_RETRY') throw e }
      if (ready) break
    }
    await sleep(1000)
  }
  if (!ready) throw new Error('Owned dev server not ready')
  result.stage = 'local-login-first-route-compilation'
  const loginStarted = Date.now()
  const login = await ownedFetch(server, port, origin + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'juan.santos', password: 'student123' }), signal: AbortSignal.timeout(90000) })
  result.login = { status: login.status, elapsedMs: Date.now() - loginStarted }
  const session = login.headers.getSetCookie().join('\n').match(/aics_session=([^;]+)/)?.[1]
  if (!login.ok || !session) throw new Error('Local login failed')
  result.stage = 'interaction-scenarios'
  globalThis.__phase2Gate = {
    ensure: () => assertListenerOwner(server, port),
    session: async () => session,
    browser: async () => {
      const browser = sharedBrowser || await launchOwnedBrowser('ui-browser', out)
      sharedBrowser = browser
      // Existing scenarios request close at their end. The outer owner must
      // retain its live CDP connection for graceful shutdown and verification.
      return new Proxy(browser, { get(target, key) {
        if (key === 'close') return async () => {}
        const value = Reflect.get(target, key)
        return typeof value === 'function' ? value.bind(target) : value
      } })
    },
    guard: async ctx => {
      contextCount++
      await ctx.route('**/*', async route => {
        const request = route.request(), u = new URL(request.url())
        if (!['localhost', '127.0.0.1'].includes(u.hostname) || Number(u.port) !== port) { result.safety.externalBlocked++; return route.abort() }
        try {
          await assertListenerOwner(server, port)
        if (request.method() === 'GET' && u.pathname === '/api/onboarding/state') {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, role: 'student', version: 1, persisted: false,
            values: { password: true, profile: true, photo: true, tour: true, announcements: true },
            preferences: { welcomeSeen: true, checklistDismissed: true, tourSkipped: false, tasksGuideSeen: true, tasksGuideCompleted: true },
          }) })
        }
        if (!['GET', 'HEAD'].includes(request.method())) {
          result.safety.writesBlocked++
          if (request.method() === 'PATCH' && u.pathname === '/api/onboarding/state') {
            result.safety.completionSimulated++
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, persisted: false }) })
          }
          result.safety.errors.push('Unexpected local mutation blocked: ' + request.method() + ' ' + u.pathname)
          return route.abort()
        }
          await route.continue()
        }
        catch (e) { result.safety.errors.push(e.message); await route.abort() }
      })
    },
  }
  const testsDir = resolve(sourceDir, 'scripts/onboarding')
  let helper = readFileSync(resolve(repo, 'scripts/onboarding/lib.mjs'), 'utf8').replace(/\r\n/g, '\n')
  const replaceSection = (start, end, replacement) => {
    const a = helper.indexOf(start), b = helper.indexOf(end, a)
    if (a < 0 || b < 0) throw new Error('Helper adaptation anchor changed')
    helper = helper.slice(0, a) + replacement + '\n' + helper.slice(b)
  }
  replaceSection('function tcpOpen(', '// Sessions and contexts', `
export const ensureMongod = () => globalThis.__phase2Gate.ensure()
export const ensureDevServer = () => globalThis.__phase2Gate.ensure()
export const validateDevServer = () => globalThis.__phase2Gate.ensure()
export const stopDevServer = () => {} // outer runner owns cleanup
`)
  replaceSection('export async function studentSession()', 'export async function mintSession', 'export const studentSession = () => globalThis.__phase2Gate.session()\n')
  replaceSection('export async function launchBrowser()', 'export async function gateContext', 'export const launchBrowser = () => globalThis.__phase2Gate.browser()\n')
  if (helper.split('const ctx = await browser.newContext({').length !== 2) throw new Error('Browser context anchor changed')
  helper = helper.replace('const ctx = await browser.newContext({', "const ctx = await browser.newContext({ serviceWorkers: 'block',")
  if (helper.split('  return ctx\n}').length !== 2) throw new Error('Context guard insertion anchor changed')
  helper = helper.replace('  return ctx\n}', '  await globalThis.__phase2Gate.guard(ctx)\n  return ctx\n}')
  const readyAnchor = '      return page\n'
  if (helper.split(readyAnchor).length !== 2) throw new Error('Portal readiness anchor changed')
  helper = helper.replace(readyAnchor, `      // The synthetic launcher can mount before a route's real shell.
      // Target assertions begin only once that shell is usable.
      await page.locator('#main-content').waitFor({ state: 'visible', timeout: 45000 })
      if ((page.viewportSize()?.width ?? 1280) >= 1024) {
        await page.locator('[data-tour="nav-dashboard"]:visible').waitFor({ timeout: 45000 })
      }
      return page\n`)
  helper += '\nexport function resetResults() { results.length = 0; failures = 0 }\n'
  writeFileSync(resolve(testsDir, 'lib.mjs'), helper)
  writeFileSync(resolve(out, 'adapted-lib.mjs.txt'), helper)
  result.helper = { originalSHA256: sha256(readFileSync(resolve(repo, 'scripts/onboarding/lib.mjs'))), adaptedSHA256: sha256(helper) }
  process.env.GATE_WT = repo
  process.env.GATE_EVID = out
  process.env.AUTH_SECRET = localEnv('development').AUTH_SECRET
  const lib = await import(pathToFileURL(resolve(testsDir, 'lib.mjs')).href)
  for (const name of selected) {
    const original = readFileSync(resolve(repo, 'scripts/onboarding', name), 'utf8')
    const start = original.lastIndexOf('run().catch(')
    if (start < 0) throw new Error('Test entry adaptation anchor changed')
    const body = original.slice(0, start)
      .replaceAll('process.exit(failures === 0 ? 0 : 1)', 'process.exitCode = failures === 0 ? 0 : 1')
      .replaceAll('process.exit(process.exitCode)', 'return // outer runner records the exit code and owns cleanup')
    if (/process\.exit\s*\(/.test(body)) throw new Error('Unhandled direct process exit in test adaptation')
    const adapted = body + 'export const gateRun = run()\n'
    writeFileSync(resolve(testsDir, name), adapted)
    writeFileSync(resolve(out, name + '.txt'), original)
    lib.resetResults()
    process.exitCode = 0
    const record = { name, originalSHA256: sha256(original), adaptedSHA256: sha256(adapted) }
    result.tests.push(record)
    result.stage = name
    writeFileSync(resolve(out, 'interaction-result.json'), JSON.stringify(result, null, 2))
    console.log('Running', name)
    try {
      await (await import(pathToFileURL(resolve(testsDir, name)).href)).gateRun
      record.exitCode = lib.failures ? 1 : 0
    } catch (e) { record.exitCode = 1; record.error = e.message }
    finally {
      // A failed scenario must not leave pages running into the next one.
      // This browser belongs exclusively to this runner.
      record.contextCloseErrors = []
      for (const context of sharedBrowser?.contexts() || []) {
        try { await context.close() } catch { record.contextCloseErrors.push('Owned scenario context close failed') }
      }
      if (record.contextCloseErrors.length) record.exitCode = 1
    }
    record.assertions = [...lib.results]
    record.cleanup = { status: 'deferred-to-outer-finally', sharedOwnedBrowser: true }
    writeFileSync(resolve(out, 'interaction-result.json'), JSON.stringify(result, null, 2))
  }
  if (process.env.GATE_PERF === '1') {
    lib.resetResults()
    const browser = await globalThis.__phase2Gate.browser()
    result.performance = await measurePerformance(browser, lib)
    writeFileSync(resolve(out, 'performance.json'), JSON.stringify(result.performance, null, 2))
  }
} catch (e) { result.error = e.message; console.error(e.message) }
finally {
  result.cleanup = await cleanupOwned()
  result.contexts = contextCount
  result.protectedAfter = sha256(readFileSync(resolve(repo, 'next-env.d.ts')))
  result.producerUnchanged = producer.every(f => f.sha256 === sha256(readFileSync(resolve(import.meta.dirname, f.name))))
  result.finishedAt = new Date().toISOString()
  result.exitCode = result.error || result.cleanup.errors.length || result.safety.errors.length
    || !result.producerUnchanged || result.protectedBefore !== result.protectedAfter || result.tests.length !== selected.length
    || result.tests.some(t => t.exitCode) || result.lint?.exitCode || result.typecheck?.exitCode ? 1 : 0
  writeFileSync(resolve(out, 'interaction-result.json'), JSON.stringify(result, null, 2))
  process.exitCode = result.exitCode
  console.log('Interaction verification exit:', result.exitCode)
}
