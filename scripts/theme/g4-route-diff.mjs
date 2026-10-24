#!/usr/bin/env node
// G4 — Route-level screenshot diff + grep coverage (light mode).
// Plan §5.1: proves the real application — every route in the fixed matrix —
// renders pixel-identically in light mode after Phase 0, and the migration
// inventory is complete (no stragglers, no smuggled class changes).
//
// Command:
//   bun scripts/theme/g4-route-diff.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g4/
//
// Stages (the gate runs as one logical unit; stages exist so each fits
// execution timeouts — run setup, then capture; `--stage all` runs both):
//   setup   — baseline scratch worktree + install + env + builds (both sides)
//   capture — servers + re-seeded capture passes + pixel diffs + greps + report
//             + cleanup (servers stopped, baseline worktree removed)
//
// Environment preconditions (reported, never silently assumed):
//   - MongoDB reachable at MONGODB_URI (dev .env.local) with the seeded
//     demo dataset (scripts/seed-mongodb.ts; re-seeded before EACH capture
//     pass so per-route database state is identical on both sides).
//   - Playwright Chromium installed (bunx playwright install chromium).
//
// Coverage is never reduced silently: any route, interaction, or check that
// cannot be captured FAILS the gate with the gap reported. Authenticated
// captures additionally assert the rendered page is NOT the login view.
//
// Deviations from the plan text (documented in the manifest):
//   - The student COE modal interaction is captured on /profile — the COE
//     request UI (COEModal + "Preview Certificate") lives on the profile
//     page, not /enrollment (verified in the tree; plan §5.1 named the
//     feature, the matrix's /profile route carries it).
//   - Faculty/admin sessions are minted with the dev fallback session secret
//     (the same JWT shape POST /api/auth/login issues; validated against the
//     DB user + tokenVersion by src/lib/session-auth.ts) — equivalent to the
//     "seeded dev accounts" method; no credentials are committed.

import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { SignJWT } from 'jose'
import {
  WT, EVID, git, headSha, readBaselineSha, launchBrowser, newGateContext,
  pixelDiff, writeManifest, resolve,
} from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const baselineArg = argOf('--baseline', null)
const outDir = argOf('--out', `${EVID}/g4`)
const stage = argOf('--stage', 'all')

const baseline = readBaselineSha()
if (baselineArg && baselineArg !== baseline) {
  console.error(`G4 FAIL: --baseline ${baselineArg} does not match the pinned baseline ${baseline}`)
  process.exit(2)
}

const MAIN_WT = '/home/z/my-project'
const BASELINE_WT = '/home/z/my-project/.baseline-check'
const PORT_BASE = 4100
const PORT_HEAD = 4200
const ORIGIN_BASE = `http://127.0.0.1:${PORT_BASE}`
const ORIGIN_HEAD = `http://127.0.0.1:${PORT_HEAD}`
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'
const SESSION_COOKIE = 'aics_session'
const BRANCH = 'commonwealth'
const STUDENT = 'juan.santos'
const FACULTY = 'm.reyes'
const ADMIN = 'admin'

// --- the fixed route matrix (enumerated; never silently reduced) -----------
const studentBase = `/portal/${BRANCH}/student/${STUDENT}`
const facultyBase = `/portal/${BRANCH}/faculty/${FACULTY}`
const adminBase = `/portal/${BRANCH}/admin/${ADMIN}`

const ROUTES = [
  { name: 'login', url: '/portal/login', role: null },
  { name: 'legal-privacy', url: '/legal/privacy', role: null },
  { name: 'legal-terms', url: '/legal/terms', role: null },
  { name: 'legal-cookies', url: '/legal/cookies', role: null },
  { name: 'legal-refund', url: '/legal/refund', role: null },
  { name: 'student-dashboard', url: studentBase, role: 'student' },
  { name: 'student-academics', url: `${studentBase}/academics`, role: 'student' },
  { name: 'student-settings', url: `${studentBase}/settings`, role: 'student' },
  { name: 'student-enrollment', url: `${studentBase}/enrollment`, role: 'student' },
  { name: 'student-events', url: `${studentBase}/events`, role: 'student' },
  { name: 'student-tasks', url: `${studentBase}/tasks`, role: 'student' },
  { name: 'student-profile', url: `${studentBase}/profile`, role: 'student' },
  { name: 'student-professors', url: `${studentBase}/professors`, role: 'student' },
  { name: 'faculty-dashboard', url: facultyBase, role: 'faculty' },
  { name: 'faculty-my-students', url: `${facultyBase}/my-students`, role: 'faculty' },
  { name: 'faculty-grade-encoding', url: `${facultyBase}/grade-encoding`, role: 'faculty' },
  { name: 'admin-dashboard', url: adminBase, role: 'admin' },
  { name: 'admin-people', url: `${adminBase}/people`, role: 'admin' },
  { name: 'admin-events', url: `${adminBase}/events`, role: 'admin' },
  { name: 'admin-announcements', url: `${adminBase}/announcements`, role: 'admin' },
]

const INTERACTIONS = [
  {
    name: 'interaction-admin-events-modal',
    url: `${adminBase}/events`,
    role: 'admin',
    click: 'button:has-text("Add event")',
  },
  {
    name: 'interaction-student-coe-modal',
    url: `${studentBase}/profile`,
    role: 'student',
    click: 'button:has-text("Preview Certificate")',
  },
  {
    name: 'interaction-topbar-dropdown',
    url: studentBase,
    role: 'student',
    click: '[aria-label="Account menu"]',
  },
  {
    name: 'interaction-skeleton-loading',
    url: `${studentBase}/events`,
    role: 'student',
    hangApi: true,
  },
]

const ALL_CAPTURES = [...ROUTES, ...INTERACTIONS]

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const sh = (cmd, opts = {}) => execFileSync(cmd, { shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts })

async function waitForServer(origin, timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${origin}/portal/login`)
      if (res.ok || (res.status >= 300 && res.status < 400)) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`server at ${origin} did not become ready within ${timeoutMs / 1000}s`)
}

async function mintSession(username, role, branch) {
  return new SignJWT({ role, branch, tv: 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(DEV_SECRET))
}

async function capturePass(browser, origin, sideLabel, outRoot) {
  const shots = []
  for (const job of ALL_CAPTURES) {
    const context = await newGateContext(browser)
    const page = await context.newPage()
    try {
      await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
      // session
      if (job.role === 'student') {
        // POST /api/auth/demo via the runtime's native fetch: Playwright's
        // context.request throws on Set-Cookie parsing under Bun (verified);
        // the real demo-issued cookie value is injected into the context.
        const res = await fetch(`${origin}/api/auth/demo`, { method: 'POST' })
        if (!res.ok) throw new Error(`demo auth failed on ${sideLabel}: ${res.status}`)
        const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]
        const m = (raw || []).join('\n').match(/aics_session=([^;]+)/)
        if (!m) throw new Error(`demo auth did not set aics_session on ${sideLabel}`)
        await context.addCookies([{ name: SESSION_COOKIE, value: m[1], url: origin }])
      } else if (job.role === 'faculty' || job.role === 'admin') {
        const username = job.role === 'faculty' ? FACULTY : ADMIN
        const token = await mintSession(username, job.role, BRANCH)
        await context.addCookies([{ name: SESSION_COOKIE, value: token, url: origin }])
      }
      if (job.hangApi) {
        // Deterministic skeleton state: every API request hangs forever.
        await page.route('**/api/**', () => {})
        await page.goto(`${origin}${job.url}`, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
      } else {
        await page.goto(`${origin}${job.url}`, { waitUntil: 'networkidle', timeout: 45000 })
        await page.waitForTimeout(500)
      }
      // Content validation: authenticated routes must NOT have landed on the
      // login view (an invalid session client-redirects to /portal/login).
      if (job.role) {
        const path = new URL(page.url()).pathname
        if (path === '/portal/login') {
          throw new Error(`authenticated route rendered the login view on ${sideLabel} (session not accepted)`)
        }
      }
      if (job.click) {
        await page.click(job.click, { timeout: 10000 })
        await page.waitForTimeout(400)
      }
      const png = resolve(outRoot, `${job.name}-${sideLabel}.png`)
      await page.screenshot({ path: png, fullPage: true })
      shots.push({ name: job.name, png, ok: true })
      console.log(`  [${sideLabel}] ${job.name} captured`)
    } catch (e) {
      shots.push({ name: job.name, error: String(e), ok: false })
      console.log(`  [${sideLabel}] ${job.name} FAILED: ${String(e).slice(0, 220)}`)
    } finally {
      await context.close()
    }
  }
  return shots
}

function cssSize(worktree) {
  // Turbopack emits app CSS under .next/static/chunks (webpack used
  // .next/static/css) — measure both.
  const dirs = [resolve(worktree, '.next/static/css'), resolve(worktree, '.next/static/chunks')]
  let total = 0
  const files = []
  for (const dir of dirs) {
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.css')) {
        const s = statSync(resolve(dir, f)).size
        total += s
        files.push(`${f}: ${s}`)
      }
    }
  }
  return total ? { total, files } : null
}

// ---------------------------------------------------------------------------
// STAGE: setup
// ---------------------------------------------------------------------------

if (stage === 'setup' || stage === 'all') {
  mkdirSync(outDir, { recursive: true })
  const routesDir = resolve(outDir, 'routes')
  mkdirSync(routesDir, { recursive: true })

  const envLocal = readFileSync(resolve(WT, '.env.local'), 'utf8')
  const mongoUri = (envLocal.match(/MONGODB_URI=(.*)/) || [])[1]?.trim()
  if (!mongoUri) {
    console.error('G4 FAIL: MONGODB_URI missing from dev worktree .env.local')
    process.exit(2)
  }

  const excludePath = resolve(MAIN_WT, '.git/info/exclude')
  const exclude = readFileSync(excludePath, 'utf8')
  if (!exclude.includes('.baseline-check')) {
    writeFileSync(excludePath, exclude + '/.baseline-check/\n')
  }
  if (existsSync(BASELINE_WT)) {
    sh(`git -C ${MAIN_WT} worktree remove --force ${BASELINE_WT}`)
  }
  console.log(`G4[setup]: adding baseline scratch worktree at ${BASELINE_WT} (${baseline.slice(0, 10)})`)
  sh(`git -C ${MAIN_WT} worktree add --detach ${BASELINE_WT} ${baseline}`)
  console.log('G4[setup]: installing dependencies in baseline worktree')
  sh(`cd ${BASELINE_WT} && bun install`, { stdio: 'pipe' })
  writeFileSync(
    resolve(BASELINE_WT, '.env.local'),
    `MONGODB_URI=${mongoUri}\nMONGODB_DB=aics_portal\nAPP_ENV=development\n`
  )
  // The dev worktree's .env.local must also classify as development so the
  // demo auth route works under `next start` (NODE_ENV=production otherwise).
  writeFileSync(
    resolve(WT, '.env.local'),
    `MONGODB_URI=${mongoUri}\nMONGODB_DB=aics_portal\nAPP_ENV=development\n`
  )
  console.log('G4[setup]: building baseline worktree')
  sh(`cd ${BASELINE_WT} && APP_ENV=development bun run build`, { stdio: 'inherit' })
  console.log('G4[setup]: building dev worktree (HEAD)')
  sh(`cd ${WT} && APP_ENV=development bun run build`, { stdio: 'inherit' })
  console.log('G4[setup]: complete — run with --stage capture next')
  if (stage === 'setup') process.exit(0)
}

// ---------------------------------------------------------------------------
// STAGE: capture
// ---------------------------------------------------------------------------

let servers = []
const cleanup = async () => {
  for (const s of servers) {
    try {
      s.proc.kill('SIGTERM')
      await new Promise((r) => setTimeout(r, 400))
      try {
        s.proc.kill('SIGKILL')
      } catch {}
    } catch {}
  }
  servers = []
}

try {
  if (!existsSync(BASELINE_WT) || !existsSync(resolve(BASELINE_WT, '.next/BUILD_ID'))) {
    throw new Error('baseline worktree not prepared — run --stage setup first')
  }
  if (!existsSync(resolve(WT, '.next/BUILD_ID'))) {
    throw new Error('dev worktree build missing — run --stage setup first')
  }

  const startServer = (worktree, port, label) => {
    const proc = spawn('node_modules/.bin/next', ['start', '-p', String(port)], {
      cwd: worktree,
      env: { ...process.env, APP_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    servers.push({ proc, label })
    proc.stdout.on('data', () => {})
    proc.stderr.on('data', (d) => process.stderr.write(`[${label}] ${d}`))
    return proc
  }
  startServer(BASELINE_WT, PORT_BASE, 'baseline')
  startServer(WT, PORT_HEAD, 'head')
  await waitForServer(ORIGIN_BASE)
  await waitForServer(ORIGIN_HEAD)
  console.log('G4[capture]: both servers ready')

  const browser = await launchBrowser()

  // --- capture passes ------------------------------------------------------
  // Deterministic data protocol (replaces re-seeding per pass): the seed
  // script randomizes part of the roster (Math.random names/numbers), so
  // re-seeding between passes would produce different people on each side.
  // Instead: seed ONCE, snapshot, baseline pass, RESTORE, post pass. This is
  // both deterministic and immune to any pass-induced DB mutations.
  const snapFile = resolve('/home/z/my-project/scripts/theme-scratch', 'g4-db-snapshot.json')
  console.log('G4[capture]: seeding database (once) + snapshotting')
  sh(`cd ${WT} && node scripts/seed-mongodb.ts`, { stdio: 'inherit' })
  const envUri = readFileSync(resolve(WT, '.env.local'), 'utf8')
  const mongoUri2 = (envUri.match(/MONGODB_URI=(.*)/) || [])[1]?.trim()
  sh(`cd ${WT} && MONGODB_URI=${mongoUri2} MONGODB_DB=aics_portal node scripts/theme/db-clone.mjs snapshot ${snapFile}`, { stdio: 'inherit' })

  for (const side of [
    { label: 'baseline', origin: ORIGIN_BASE },
    { label: 'post', origin: ORIGIN_HEAD },
  ]) {
    if (side.label === 'post') {
      console.log('G4[capture]: restoring database snapshot before post pass')
      sh(`cd ${WT} && MONGODB_URI=${mongoUri2} MONGODB_DB=aics_portal node scripts/theme/db-clone.mjs restore ${snapFile}`, { stdio: 'inherit' })
    }
    await capturePass(browser, side.origin, side.label, resolve(outDir, 'routes'))
  }
  // NOTE: the browser stays open — the pixel-diff phase below reuses it.

  // --- pixel diffs ---------------------------------------------------------
  console.log('G4[capture]: pixel-diffing route pairs')
  const routesDir = resolve(outDir, 'routes')
  const routeReport = []
  let totalDiff = 0
  let failedCaptures = 0
  for (const job of ALL_CAPTURES) {
    const b = resolve(routesDir, `${job.name}-baseline.png`)
    const h = resolve(routesDir, `${job.name}-post.png`)
    if (!existsSync(b) || !existsSync(h)) {
      failedCaptures++
      routeReport.push({ name: job.name, error: 'capture missing', diffPixels: null })
      continue
    }
    const d = await pixelDiff(browser, b, h)
    if (d.diffDataUrl) {
      writeFileSync(resolve(routesDir, `${job.name}-diff.png`), Buffer.from(d.diffDataUrl.split(',')[1], 'base64'))
    }
    totalDiff += d.diffPixels
    routeReport.push({
      name: job.name,
      diffPixels: d.diffPixels,
      sizeBaseline: d.sizeA,
      sizePost: d.sizeB,
    })
    console.log(`  ${d.diffPixels === 0 ? 'PASS' : 'DIFF'} ${job.name}: ${d.diffPixels} px (${d.sizeA} vs ${d.sizeB})`)
  }

  // --- grep coverage (exact commands + outputs recorded) ------------------
  const greps = []
  const runGrep = (desc, pattern, expect) => {
    let out = ''
    try {
      out = sh(`cd ${WT} && rg -P -n '${pattern}' src/ || true`).trim()
    } catch (e) {
      out = `ERROR: ${e}`
    }
    const lines = out ? out.split('\n').filter(Boolean) : []
    const ok =
      expect === 'none'
        ? lines.length === 0
        : expect === 'exactly-2-allowlisted'
          ? lines.length === 2 &&
            lines.every((l) => /StudentIdCard\.tsx:40.*bg-white\/80/.test(l) || /FacultyGradeEncodingPage\.tsx:530.*bg-white\/20/.test(l))
          : false
    greps.push({ desc, pattern, expect, lines, ok })
    return ok
  }
  // Plan §5.1 G4 coverage greps. The plan's literal pattern
  // 'bg-white(?!/80|/20)' excludes the two allowlisted alpha forms by
  // construction, so it asserts "no non-allowlisted remnants" (0 matches);
  // the allowlist itself is asserted with the plain 'bg-white' pattern
  // (exactly the two §2.5 exception sites). Both are recorded.
  const g1 = runGrep('no non-allowlisted bg-white remnants (plan-literal pattern)', 'bg-white(?!/80|/20)', 'none')
  const g2 = runGrep('exactly the two §2.5 allowlisted bg-white literals remain', 'bg-white', 'exactly-2-allowlisted')
  const g3 = runGrep('no text-blue-600/700/800 stragglers', 'text-blue-(600|700|800)', 'none')
  const g4 = runGrep('no bg-slate-900 stragglers', 'bg-slate-900', 'none')

  // --- class-diff vs the §2.5 mapping table --------------------------------
  const TOKEN = /(?<![\w.-])((?:[a-z]+(?=:))?:)?(bg-white|text-blue-600|text-blue-700|text-blue-800|bg-slate-900|bg-surface|text-link|text-link-strong|text-link-deep|bg-scrim)(\/\d+)?(?![\w-])/g
  const NAME_MAP = {
    'bg-white': 'bg-surface',
    'text-blue-600': 'text-link',
    'text-blue-700': 'text-link-strong',
    'text-blue-800': 'text-link-deep',
    'bg-slate-900': 'bg-scrim',
  }
  const EXPECTED_MULTISET = {
    ':bg-surface/85': 1,
    'bg-scrim/40': 5,
    'bg-scrim/50': 5,
    'bg-surface': 219,
    'bg-surface/80': 1,
    'bg-surface/95': 1,
    'file:bg-surface': 1,
    'focus:bg-scrim': 1,
    'focus:bg-surface': 1,
    'focus:text-link-strong': 1,
    'hover:bg-surface': 2,
    'hover:bg-surface/50': 2,
    'hover:text-link-deep': 1,
    'hover:text-link-strong': 10,
    'text-link': 36,
    'text-link-strong': 74,
  }
  const diff = git(`diff --unified=0 ${baseline} -- src/`)
  const removed = {}
  const added = {}
  for (const line of diff.split('\n')) {
    if (!line.startsWith('-') && !line.startsWith('+')) continue
    const store = line.startsWith('-') ? removed : added
    for (const m of line.slice(1).matchAll(TOKEN)) {
      const tok = `${m[1] || ''}${m[2]}${m[3] || ''}`
      store[tok] = (store[tok] || 0) + 1
    }
  }
  const expected = {}
  for (const [tok, n] of Object.entries(removed)) {
    const m = [...tok.matchAll(TOKEN)][0]
    const key = `${m[1] || ''}${NAME_MAP[m[2]]}${m[3] || ''}`
    expected[key] = (expected[key] || 0) + n
  }
  const canonical = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))))
  const classDiffOk = canonical(expected) === canonical(EXPECTED_MULTISET) && canonical(added) === canonical(EXPECTED_MULTISET)
  writeFileSync(
    resolve(outDir, 'class-diff.txt'),
    [
      `# class-diff extraction: git diff --unified=0 ${baseline} -- src/`,
      `# filtered to the migration families; the added-class multiset must equal`,
      `# the §2.5 mapping table exactly (no unlisted changes smuggled in).`,
      ``,
      `removed (old vocabulary): ${JSON.stringify(removed, null, 2)}`,
      `added (new vocabulary): ${JSON.stringify(added, null, 2)}`,
      `expected multiset (§2.5): ${JSON.stringify(EXPECTED_MULTISET, null, 2)}`,
      `equal: ${classDiffOk}`,
    ].join('\n') + '\n'
  )

  const grepTxt = greps
    .map((g) =>
      [
        `## ${g.desc}`,
        `$ rg -P -n '${g.pattern}' src/`,
        `expected: ${g.expect}`,
        `result (${g.lines.length} lines): ${g.ok ? 'OK' : 'FAIL'}`,
        ...g.lines.map((l) => `  ${l}`),
        ``,
      ].join('\n')
    )
    .join('\n')
  writeFileSync(resolve(outDir, 'grep-coverage.txt'), grepTxt + '\n')

  // --- CSS size delta bookkeeping -------------------------------------------
  const baseCss = cssSize(BASELINE_WT)
  const headCss = cssSize(WT)

  // --- report ---------------------------------------------------------------
  const grepsOk = g1 && g2 && g3 && g4
  const pass = totalDiff === 0 && failedCaptures === 0 && grepsOk && classDiffOk
  writeFileSync(
    resolve(outDir, 'route-report.json'),
    JSON.stringify(
      {
        gate: 'G4 route-level screenshot + grep coverage',
        baseline,
        head: headSha(),
        captures: routeReport,
        totalDiffPixels: totalDiff,
        failedCaptures,
        greps: greps.map((g) => ({ desc: g.desc, ok: g.ok, lines: g.lines.length })),
        classDiffEqual: classDiffOk,
        cssSizeDelta: { baseline: baseCss, head: headCss },
        pass,
      },
      null,
      2
    )
  )
  await browser.close()

  writeManifest(outDir, [
    'command: bun scripts/theme/g4-route-diff.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g4/',
    `exit code: ${pass ? 0 : 1}`,
    `route/state captures: ${ALL_CAPTURES.length} (${failedCaptures} failed)`,
    `total differing pixels: ${totalDiff}`,
    `grep coverage: ${grepsOk ? 'all pass' : 'FAILURE'}`,
    `class-diff == mapping table: ${classDiffOk}`,
    `emitted CSS size: baseline ${baseCss?.total ?? 'n/a'} B -> HEAD ${headCss?.total ?? 'n/a'} B`,
    `servers: baseline ${ORIGIN_BASE} (worktree ${BASELINE_WT}), HEAD ${ORIGIN_HEAD} (worktree ${WT}); both built with APP_ENV=development and started with next start`,
    'sessions: student via POST /api/auth/demo (per server); faculty/admin via dev-fallback-secret JWT (mint-session mechanism, DB-validated by src/lib/session-auth.ts); time frozen at 2026-10-24T09:00:00 via Playwright clock on every page',
    'database protocol: seeded once, snapshotted (EJSON, scripts/theme/db-clone.mjs), restored before the post pass — deterministic despite the seed script randomized roster, and immune to pass-induced mutations',
    'content validation: authenticated routes assert the rendered page is not the login view (invalid sessions client-redirect to /portal/login)',
    'deviation: student COE modal captured on /profile (the COE request UI lives there; plan named the feature)',
    'skeleton state: all /api/* requests hang (page.route never fulfilling); domcontentloaded + 2500ms settle',
    'browser: headless Chromium, viewport 1280x800, deviceScaleFactor 1, colorScheme light, prefers-reduced-motion reduce, networkidle + 500ms settle (plain routes)',
  ])

  console.log(`\nG4 ${pass ? 'PASS' : 'FAIL'}: totalDiff=${totalDiff} failedCaptures=${failedCaptures} greps=${grepsOk} classDiff=${classDiffOk}`)
  if (!pass) process.exitCode = 1
} finally {
  await cleanup()
  try {
    sh(`git -C ${MAIN_WT} worktree remove --force ${BASELINE_WT}`)
    console.log('G4[capture]: baseline scratch worktree removed')
  } catch {}
}
