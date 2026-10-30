// Shared library for the onboarding Phase 2 gate scripts
// (docs/onboarding-phase2-gate-plan.md, section 4: automation channel).
//
// Conventions follow scripts/theme/lib.mjs: every gate run writes a
// manifest (baseline SHA, HEAD SHA, exact command line, environment,
// exit codes, timestamps, deviations), and a run without a pinned
// baseline at <evidence-root>/baseline-sha.txt is invalid.
//
// Server model: each script ensures its own dependencies are up —
// mongod on 127.0.0.1:27017 (persistent dbpath, seeded once by the
// documented recovery procedure) and a dev server on the gate port —
// so every script is self-contained after a sandbox reset.

import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { resolve } from 'node:path'
import { SignJWT } from 'jose'
import { chromium } from 'playwright'

export const WT = process.env.GATE_WT || '/home/z/my-project/aics-mfd'
export const EVID = resolve(
  WT,
  process.env.GATE_EVID || 'docs/done/qa_evidence/ui-ux/onboarding/phase2-gate'
)
export const BRANCH = 'commonwealth'
export const STUDENT = 'juan.santos'
export const FACULTY = 'm.reyes'
export const ADMIN = 'admin'
const GATE_PORT = Number(process.env.GATE_PORT || 4310)
// localhost, never 127.0.0.1: Next 16's dev-origin protection blocks
// /_next dev resources for raw IPs unless allowedDevOrigins lists them,
// which would silently skip the client bundle (probe: banner-only page).
export const ORIGIN = `http://localhost:${GATE_PORT}`
// mongod from the mongodb-memory-server downloader (recovery.md Known
// issues); persistent dbpath seeded once per sandbox provisioning.
const MONGO_BIN =
  process.env.GATE_MONGO_BIN ||
  '/home/z/my-project/node_modules/.cache/mongodb-memory-server/mongod-x64-debian-7.0.24'
const MONGO_DATA = process.env.GATE_MONGO_DATA || '/home/z/my-project/scripts/mongo-data'
const MONGO_LOG = process.env.GATE_MONGO_LOG || '/home/z/my-project/scripts/mongod.log'

// The dev server boots with .env.local's APP_ENV=development and no
// AUTH_SECRET, so session signing uses the documented dev fallback
// (src/lib/env.ts); minted faculty/admin sessions use the same secret.
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'

export function invocationLine(scriptName) {
  const env = []
  for (const k of ['GATE_WT', 'GATE_EVID', 'GATE_PORT', 'GATE_MONGO_BIN']) {
    if (process.env[k]) env.push(`${k}=${process.env[k]}`)
  }
  return `${env.length ? env.join(' ') + ' ' : ''}bun scripts/onboarding/${scriptName} ${process.argv.slice(2).join(' ')}`.trim()
}

export function git(args) {
  return execFileSync('git', args.split(' '), {
    cwd: WT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim()
}

export function headSha() {
  return git('rev-parse HEAD')
}

export function readBaselineSha() {
  const p = resolve(EVID, 'baseline-sha.txt')
  if (!existsSync(p)) {
    throw new Error(`baseline SHA not pinned: ${p} missing — a gate run without a recorded baseline is invalid (gate plan section 8)`)
  }
  const sha = readFileSync(p, 'utf8').trim()
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`invalid baseline SHA: ${sha}`)
  return sha
}

export function writeManifest(outDir, lines) {
  mkdirSync(outDir, { recursive: true })
  const body = [
    `timestamp: ${new Date().toISOString()}`,
    `baseline SHA: ${readBaselineSha()}`,
    `HEAD SHA: ${headSha()}`,
    `worktree: ${WT}`,
    ...lines,
  ].join('\n')
  writeFileSync(resolve(outDir, 'manifest.txt'), body + '\n')
  return body
}

// ---------------------------------------------------------------------------
// Results collection: step(desc, ok, detail) prints PASS/FAIL and
// collects for the report writers.
// ---------------------------------------------------------------------------

export const results = []
export let failures = 0

export function step(desc, ok, detail = '') {
  if (!ok) failures++
  results.push({ desc, ok, detail })
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${desc}${detail ? ` — ${detail}` : ''}`)
}

export function writeReport(outDir, name, intro, sections) {
  const lines = [
    `# ${name}`,
    '',
    intro,
    '',
    `Run: ${new Date().toISOString()}`,
    `Baseline SHA: ${readBaselineSha()}  HEAD SHA: ${headSha()}`,
    '',
  ]
  for (const [header, body] of sections) {
    lines.push(`## ${header}`, '', body, '')
  }
  lines.push('## Results', '')
  lines.push('| # | Result | Detail |')
  lines.push('|---|---|---|')
  results.forEach((r, i) => lines.push(`| ${i + 1} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.desc}${r.detail ? ` (${r.detail})` : ''} |`))
  lines.push('', `${results.filter((r) => r.ok).length} pass, ${results.filter((r) => !r.ok).length} fail`, '')
  writeFileSync(resolve(outDir, name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.md'), lines.join('\n'))
}

// ---------------------------------------------------------------------------
// Infrastructure: mongod + dev server, both ensured per script.
// mongod liveness is a raw TCP probe (bun cannot load the mongodb
// driver; the DB layer itself is proven by the seed and the app).
// ---------------------------------------------------------------------------

function tcpOpen(port, host = '127.0.0.1', timeout = 800) {
  return new Promise((res) => {
    const sock = createConnection({ port, host })
    sock.setTimeout(timeout)
    sock.once('connect', () => {
      sock.destroy()
      res(true)
    })
    sock.once('timeout', () => {
      sock.destroy()
      res(false)
    })
    sock.once('error', () => {
      sock.destroy()
      res(false)
    })
  })
}

export async function ensureMongod() {
  if (await tcpOpen(27017)) return
  if (!existsSync(MONGO_BIN)) {
    throw new Error(`mongod binary missing at ${MONGO_BIN} — re-provision per docs/recovery.md (Known issues)`)
  }
  mkdirSync(MONGO_DATA, { recursive: true })
  execFileSync(MONGO_BIN, [
    '--dbpath', MONGO_DATA,
    '--bind_ip', '127.0.0.1',
    '--port', '27017',
    '--fork',
    '--logpath', MONGO_LOG,
  ])
  for (let i = 0; i < 60; i++) {
    if (await tcpOpen(27017)) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('mongod did not become ready on 127.0.0.1:27017')
}

let devProc = null

const DEV_PIDFILE = resolve(WT, 'scripts/onboarding/.dev-server.pid')
const DEV_LOG = resolve(WT, 'scripts/onboarding/dev-server.log')

async function devPortAlive() {
  try {
    const res = await fetch(`${ORIGIN}/portal/login`, { signal: AbortSignal.timeout(8000) })
    return res.ok || (res.status >= 300 && res.status < 400)
  } catch {
    return false
  }
}

async function killStaleDev() {
  // A previous script killed mid-run can orphan its dev server (the
  // .bin/next launcher forks a next-server worker); a listening-but-dead
  // port would otherwise wedge the readiness loop. The server runs as
  // its own process group, so -pid takes the whole tree.
  try {
    const pid = Number(readFileSync(DEV_PIDFILE, 'utf8').trim())
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(-pid, 'SIGKILL')
      } catch {
        try {
          process.kill(pid, 'SIGKILL')
        } catch {}
      }
      await new Promise((r) => setTimeout(r, 500))
    }
  } catch {}
  try {
    writeFileSync(DEV_PIDFILE, '')
  } catch {}
}

export async function ensureDevServer({ env = {} } = {}) {
  // Reuse if a previous script left a healthy one on the gate port.
  if (await devPortAlive()) return
  if (await tcpOpen(GATE_PORT)) await killStaleDev()
  // Detached (own process group, survives a killed script) with stdio
  // to a log file, never pipes: a detached child writing into pipes
  // whose reader died wedges headless (binds, never serves).
  const logFd = openSync(DEV_LOG, 'a')
  devProc = spawn('node_modules/.bin/next', ['dev', '-p', String(GATE_PORT)], {
    cwd: WT,
    env: { ...process.env, ...env },
    stdio: ['ignore', logFd, logFd],
    detached: true,
  })
  writeFileSync(DEV_PIDFILE, String(devProc.pid))
  devProc.unref()
  for (let i = 0; i < 90; i++) {
    if (await devPortAlive()) return
    await new Promise((r) => setTimeout(r, 2000))
  }
  throw new Error(`dev server did not become ready at ${ORIGIN} (log: ${DEV_LOG})`)
}

export function stopDevServer() {
  if (devProc) {
    const pid = devProc.pid
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      try {
        devProc.kill('SIGTERM')
      } catch {}
    }
    devProc = null
  }
  try {
    writeFileSync(DEV_PIDFILE, '')
  } catch {}
}

// ---------------------------------------------------------------------------
// Sessions and contexts
// ---------------------------------------------------------------------------

let studentCookie = null

export async function studentSession() {
  if (studentCookie) return studentCookie
  const res = await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST' })
  if (!res.ok) throw new Error(`demo login failed: ${res.status}`)
  const setCookie = res.headers.getSetCookie().join('\n')
  studentCookie = setCookie.match(/aics_session=([^;]+)/)[1]
  return studentCookie
}

export async function mintSession(username, role) {
  return new SignJWT({ role, branch: BRANCH, tv: 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(DEV_SECRET))
}

export async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--hide-scrollbars'],
  })
}

export async function gateContext(browser, opts = {}) {
  const ctx = await browser.newContext({
    viewport: opts.viewport ?? { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: opts.colorScheme ?? 'light',
    reducedMotion: opts.reducedMotion ?? 'no-preference',
    recordVideo: opts.recordVideo ? { dir: opts.recordVideo.dir, size: opts.recordVideo.size } : undefined,
  })
  const session =
    opts.session ?? (opts.role && opts.role !== 'student'
      ? await mintSession(opts.username, opts.role)
      : await studentSession())
  await ctx.addCookies([{ name: 'aics_session', value: session, url: ORIGIN }])
  // Gate default: cookie consent already decided, so the legal banner
  // (z-50, bottom-docked) does not overlay the tour surfaces. The
  // banner itself is an existing surface, regression-checked separately.
  const storage = { aics_cookie_consent: 'essential', ...(opts.localStorage ?? {}) }
  for (const [k, v] of Object.entries(storage)) {
    await ctx.addInitScript(`localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`)
  }
  return ctx
}

export function studentUrl(view = '') {
  return `${ORIGIN}/portal/${BRANCH}/student/${STUDENT}${view ? '/' + view : ''}`
}

// ---------------------------------------------------------------------------
// Tour helpers
// ---------------------------------------------------------------------------

export async function openPortal(ctx, view = '') {
  let lastErr = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const page = await ctx.newPage()
    try {
      await page.goto(studentUrl(view), { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForSelector('[data-tour="dev-tour-launcher"]', { timeout: 45000 })
      return page
    } catch (err) {
      lastErr = err
      try {
        await page.close()
      } catch {}
      // First load after a fresh dev-server boot compiles the route;
      // one retry absorbs slow compiles and transient fetch misses.
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000))
    }
  }
  throw lastErr
}

export async function startTour(page, { toDisposition = 'spot' } = {}) {
  await page.click('[data-tour="dev-tour-launcher"]')
  await page.waitForSelector('[data-tour-overlay]', { timeout: 10000 })
  if (toDisposition) {
    await page.waitForFunction(
      (d) => document.querySelector('[data-tour-overlay]')?.dataset.disposition === d,
      toDisposition,
      { timeout: 15000 }
    )
  }
  return page
}

export async function waitForStep(page, stepId, timeout = 20000) {
  await page.waitForFunction(
    (id) => document.querySelector('[data-tour-overlay]')?.dataset.stepId === id,
    stepId,
    { timeout }
  )
}

/** Wait for the step's disposition, then wait until the spotlight rect
 * stops moving (two identical reads 150ms apart) — assertions read a
 * settled overlay, never a mid-settle frame. */
export async function settledState(page, disposition = 'spot', timeout = 20000) {
  await page.waitForFunction(
    (d) => document.querySelector('[data-tour-overlay]')?.dataset.disposition === d,
    disposition,
    { timeout }
  )
  if (disposition !== 'spot') return overlayState(page)
  let prev = null
  for (let i = 0; i < 20; i++) {
    const state = await overlayState(page)
    const s = JSON.stringify(state.spotlight)
    if (prev === s && state.spotlight !== null) return state
    prev = s
    await page.waitForTimeout(150)
  }
  return overlayState(page)
}

export async function clickNext(page) {
  await page.click('button[aria-label="Go to the next tour step"]')
}

export async function targetRect(page, target) {
  return page.evaluate((t) => {
    const el = document.querySelector(`[data-tour="${t}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top, left: r.left, width: r.width, height: r.height }
  }, target)
}

export function spotOverlapsTarget(spot, rect) {
  if (!spot || !rect) return false
  return (
    spot.left < rect.left + rect.width &&
    spot.left + spot.width > rect.left &&
    spot.top < rect.top + rect.height &&
    spot.top + spot.height > rect.top
  )
}

export function overlayState(page) {
  return page.evaluate(() => {
    const overlay = document.querySelector('[data-tour-overlay]')
    const spot = document.querySelector('[data-tour-spotlight]')
    const card = document.querySelector('[data-tour-card]')
    return {
      present: !!overlay,
      stepId: overlay?.dataset.stepId ?? null,
      disposition: overlay?.dataset.disposition ?? null,
      spotlight: spot
        ? (() => {
            const r = spot.getBoundingClientRect()
            return { top: r.top, left: r.left, width: r.width, height: r.height }
          })()
        : null,
      card: card
        ? {
            top: card.getBoundingClientRect().top,
            left: card.getBoundingClientRect().left,
            w: card.offsetWidth,
            h: card.offsetHeight,
          }
        : null,
      activeElement:
        document.activeElement?.id ||
        document.activeElement?.getAttribute('aria-label') ||
        document.activeElement?.tagName ||
        null,
      live: document.querySelector('[data-tour-overlay] > p[aria-live="polite"]')?.textContent ?? null,
    }
  })
}

/** Card fully inside the viewport (B1/C1 clamp rule). */
export function cardInViewport(state, vpt) {
  if (!state.card) return false
  return (
    state.card.left >= -1 &&
    state.card.top >= -1 &&
    state.card.left + state.card.w <= vpt.width + 1 &&
    state.card.top + state.card.h <= vpt.height + 1
  )
}
