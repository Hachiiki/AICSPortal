#!/usr/bin/env node
// G4 — Route-level screenshot diff + grep coverage (light mode).
// Plan §5.1: proves the real application — every route in the fixed matrix —
// renders pixel-identically in light mode after Phase 0, and the migration
// inventory is complete (no stragglers, no smuggled class changes).
//
// Command (Phase 0):
//   bun scripts/theme/g4-route-diff.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g4/
// Phase-1 re-run (plan §5.1 "Phase-1 re-run", §6 exit gates):
//   GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase1 \
//   bun scripts/theme/g4-route-diff.mjs --mode parity --out docs/done/qa_evidence/ui-ux/dark-theme/phase1/g4-parity/
//   (at commit 1a, the engine-only state: zero pixels, the literal plan
//    criterion, because no control ships yet)
//   GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase1 \
//   bun scripts/theme/g4-route-diff.mjs --mode final --allow-diff <names> --out docs/done/qa_evidence/ui-ux/dark-theme/phase1/g4/
//   (at HEAD with controls: zero pixels everywhere EXCEPT the routes that
//    render the new theme controls, each diff's bounding box recorded and
//    reviewed; the legal routes carry no control and stay the 0-px control)
//
// Modes:
//   phase0 (default) — the Phase-0 acceptance run: exact §2.5 multiset
//     class-diff, 0 px on all routes.
//   parity — Phase-1 engine re-run: 0 px on all routes; class-diff asserts
//     no old-vocabulary token reappears (new-vocabulary changes are
//     recorded; the body-class removal shows up there and is explained in
//     the manifest).
//   final — Phase-1 full re-run with controls: routes named in
//     --allow-diff (comma-separated) may differ (diff count + bounding
//     box recorded per route); every other route must be 0 px; class-diff
//     same rule as parity (controls may add new-vocabulary classes).
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
//   - GATE_MAIN_WT / GATE_BASELINE_WT override the repo holding the objects
//     and the baseline scratch path (defaults documented in lib.mjs).
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
  WT, EVID, SCRATCH_ROOT, git, headSha, readBaselineSha, launchBrowser, newGateContext,
  pixelDiff, writeManifest, invocationLine, resolve,
} from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const baselineArg = argOf('--baseline', null)
const outDir = argOf('--out', `${EVID}/g4`)
const stage = argOf('--stage', 'all')
const mode = argOf('--mode', 'phase0')
const allowDiffArg = argOf('--allow-diff', '')
const allowDiff = new Set(allowDiffArg ? allowDiffArg.split(',').map((s) => s.trim()).filter(Boolean) : [])
if (!['phase0', 'parity', 'final'].includes(mode)) {
  console.error(`G4 FAIL: unknown --mode ${mode} (phase0 | parity | final)`)
  process.exit(2)
}
if (mode === 'final' && !allowDiff.size) {
  console.error('G4 FAIL: --mode final requires --allow-diff <route,names> so every permitted diff is explicit (coverage is never loosened silently)')
  process.exit(2)
}

const baseline = readBaselineSha()
if (baselineArg && baselineArg !== baseline) {
  console.error(`G4 FAIL: --baseline ${baselineArg} does not match the pinned baseline ${baseline}`)
  process.exit(2)
}

const MAIN_WT = process.env.GATE_MAIN_WT || '/home/z/my-project'
const BASELINE_WT = process.env.GATE_BASELINE_WT || '/home/z/my-project/.baseline-check'
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
        // Deterministic skeleton state: the DATA requests hang forever,
        // but /api/auth/session must answer — useAuth gates the whole
        // portal render on it (hanging it too yields an empty page, never
        // a skeleton; that vacuous capture is issue #<phase0-skeleton>,
        // fixed here for the Phase-1 runs).
        await page.route('**/api/**', (route) => {
          if (route.request().url().includes('/api/auth/session')) {
            return route.continue()
          }
          return undefined // hang
        })
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
  const snapFile = resolve(SCRATCH_ROOT, 'g4-db-snapshot.json')
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
  let unexpectedDiffs = 0
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
    const allowed = mode === 'final' && allowDiff.has(job.name)
    if (d.diffPixels !== 0 && !allowed) unexpectedDiffs++
    routeReport.push({
      name: job.name,
      diffPixels: d.diffPixels,
      sizeBaseline: d.sizeA,
      sizePost: d.sizeB,
      bbox: d.bbox,
      diffAllowed: allowed,
    })
    const verdict = d.diffPixels === 0 ? 'PASS' : allowed ? 'DIFF (allowed, recorded)' : 'DIFF (UNEXPECTED)'
    console.log(`  ${verdict} ${job.name}: ${d.diffPixels} px (${d.sizeA} vs ${d.sizeB})${d.bbox ? ` bbox=[${d.bbox.minX},${d.bbox.minY}..${d.bbox.maxX},${d.bbox.maxY}]` : ''}`)
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
  const OLD_VOCAB = /bg-white|text-blue-(600|700|800)|bg-slate-900/
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
  let classDiffOk
  let classDiffNote
  if (mode === 'phase0') {
    const expected = {}
    for (const [tok, n] of Object.entries(removed)) {
      const m = [...tok.matchAll(TOKEN)][0]
      const key = `${m[1] || ''}${NAME_MAP[m[2]]}${m[3] || ''}`
      expected[key] = (expected[key] || 0) + n
    }
    const canonical = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))))
    classDiffOk = canonical(expected) === canonical(EXPECTED_MULTISET) && canonical(added) === canonical(EXPECTED_MULTISET)
    classDiffNote = 'phase0: added == expected == §2.5 mapping table exactly'
  } else {
    // parity / final: the Phase-1 rule. Old vocabulary may never reappear
    // (that is what the greps assert tree-wide; this asserts it for the
    // diff specifically). New-vocabulary changes are recorded: the engine
    // removes the body's hardcoded bg-surface (the @layer base rule takes
    // over, byte-identical in light, proven by the pixel diff), and the
    // controls legitimately add semantic-token classes.
    const oldInRemoved = Object.keys(removed).filter((t) => OLD_VOCAB.test(t))
    const oldInAdded = Object.keys(added).filter((t) => OLD_VOCAB.test(t))
    classDiffOk = oldInRemoved.length === 0 && oldInAdded.length === 0
    classDiffNote = `${mode}: zero old-vocabulary tokens in the diff (${oldInRemoved.length} removed / ${oldInAdded.length} added); new-vocabulary changes recorded below`
  }
  writeFileSync(
    resolve(outDir, 'class-diff.txt'),
    [
      `# class-diff extraction: git diff --unified=0 ${baseline} -- src/`,
      `# filtered to the migration families; mode: ${mode}`,
      `# ${classDiffNote}`,
      `# phase0 rule: added-class multiset must equal the §2.5 mapping table exactly.`,
      `# parity/final rule: no old-vocabulary token may appear; new-vocabulary`,
      `# removals/additions are evidence (body-class removal, new controls).`,
      ``,
      `removed (old vocabulary): ${JSON.stringify(removed, null, 2)}`,
      `added (new vocabulary): ${JSON.stringify(added, null, 2)}`,
      `expected multiset (§2.5, phase0 only): ${JSON.stringify(EXPECTED_MULTISET, null, 2)}`,
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
  const pass = unexpectedDiffs === 0 && failedCaptures === 0 && grepsOk && classDiffOk
  writeFileSync(
    resolve(outDir, 'route-report.json'),
    JSON.stringify(
      {
        gate: 'G4 route-level screenshot + grep coverage',
        mode,
        allowDiff: [...allowDiff],
        baseline,
        head: headSha(),
        captures: routeReport,
        totalDiffPixels: totalDiff,
        failedCaptures,
        unexpectedDiffs,
        greps: greps.map((g) => ({ desc: g.desc, ok: g.ok, lines: g.lines.length })),
        classDiffEqual: classDiffOk,
        classDiffNote,
        cssSizeDelta: { baseline: baseCss, head: headCss },
        pass,
      },
      null,
      2
    )
  )
  await browser.close()

  writeManifest(outDir, [
    `command: ${invocationLine('g4-route-diff.mjs')}`,
    `mode: ${mode}${allowDiff.size ? ` (allow-diff: ${[...allowDiff].join(',')})` : ''}`,
    `exit code: ${pass ? 0 : 1}`,
    `route/state captures: ${ALL_CAPTURES.length} (${failedCaptures} failed)`,
    `total differing pixels: ${totalDiff} (unexpected: ${unexpectedDiffs})`,
    `grep coverage: ${grepsOk ? 'all pass' : 'FAILURE'}`,
    `class-diff: ${classDiffOk} — ${classDiffNote}`,
    `emitted CSS size: baseline ${baseCss?.total ?? 'n/a'} B -> HEAD ${headCss?.total ?? 'n/a'} B`,
    `servers: baseline ${ORIGIN_BASE} (worktree ${BASELINE_WT}), HEAD ${ORIGIN_HEAD} (worktree ${WT}); both built with APP_ENV=development and started with next start`,
    'sessions: student via POST /api/auth/demo (per server); faculty/admin via dev-fallback-secret JWT (mint-session mechanism, DB-validated by src/lib/session-auth.ts); time frozen at 2026-10-24T09:00:00 via Playwright clock on every page',
    'database protocol: seeded once, snapshotted (EJSON, scripts/theme/db-clone.mjs), restored before the post pass — deterministic despite the seed script randomized roster, and immune to pass-induced mutations',
    'content validation: authenticated routes assert the rendered page is not the login view (invalid sessions client-redirect to /portal/login)',
    'deviation: student COE modal captured on /profile (the COE request UI lives there; plan named the feature)',
    'skeleton state: all /api/* requests EXCEPT /api/auth/session hang (page.route never fulfilling) — the session call must answer because useAuth gates the portal render on it (the Phase-0 variant hung it too and captured an empty page on both sides; see the filed issue); domcontentloaded + 2500ms settle',
    'browser: headless Chromium, viewport 1280x800, deviceScaleFactor 1, colorScheme light, prefers-reduced-motion reduce, networkidle + 500ms settle (plain routes)',
    'phase-1 note (parity mode): zero pixels expected everywhere; the engine ships no control at commit 1a. phase-1 note (final mode): allow-listed routes carry the new theme controls (login toggle, topbar toggle, settings appearance section); every diff bounding box is recorded in route-report.json and each <route>-diff.png is retained for review; legal routes carry no control and must stay at 0 px',
  ])

  console.log(`\nG4 ${pass ? 'PASS' : 'FAIL'} (mode ${mode}): totalDiff=${totalDiff} unexpectedDiffs=${unexpectedDiffs} failedCaptures=${failedCaptures} greps=${grepsOk} classDiff=${classDiffOk}`)
  if (!pass) process.exitCode = 1
} finally {
  await cleanup()
  try {
    sh(`git -C ${MAIN_WT} worktree remove --force ${BASELINE_WT}`)
    console.log('G4[capture]: baseline scratch worktree removed')
  } catch {}
}
