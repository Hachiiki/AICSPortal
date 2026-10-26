#!/usr/bin/env node
// Stage 2A negative control (issue #92 follow-up) — proves the G4 skeleton
// presence assertion actually FAILS when the capture would be vacuous.
//
// g4-route-diff.mjs now fails the interaction-skeleton-loading capture when
// .aics-skeleton blocks are absent or hidden. This script applies THE SAME
// predicate (skeletonPresence, imported from lib.mjs — it cannot drift from
// the real assertion) to three controlled conditions against the real HEAD
// build:
//
//   A. vacuous  — every /api/* request hangs, INCLUDING /api/auth/session
//                 (the exact Phase-0 defect): useAuth gates the whole portal
//                 render on the session call, so the page never renders and
//                 no skeletons exist.        EXPECT: assertion FAILS.
//   B. real     — the G4 condition: data APIs hang, /api/auth/session
//                 answered (the issue #92 fix): the skeleton shell renders.
//                                              EXPECT: assertion PASSES.
//   C. hidden   — condition B plus an injected .aics-skeleton
//                 { display: none } style: blocks exist in the DOM but are
//                 not rendered.               EXPECT: assertion FAILS
//                                              (the visibility half).
//
// The expected pattern is A:FAIL, B:PASS, C:FAIL; anything else exits 1.
// Runs its own `next start` on a spare port and touches nothing else: the
// harness, the worktree, and the database are never modified (read-only
// requests plus the dev demo login only).
//
// Command:
//   GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase2 \
//   bun scripts/theme/g4-skeleton-negative.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase2/g4-skeleton-negative/
//
// Preconditions: dev worktree built (.next/BUILD_ID), mongod reachable at
// MONGODB_URI with the seeded demo dataset, .env.local present.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { WT, headSha, launchBrowser, newGateContext, writeManifest, invocationLine, resolve, skeletonPresence } from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase2/g4-skeleton-negative'))

const PORT = 4302
const ORIGIN = `http://127.0.0.1:${PORT}`
const SESSION_COOKIE = 'aics_session'
const SKELETON_ROUTE = '/portal/commonwealth/student/juan.santos/events'

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${ORIGIN}/portal/login`)
      if (res.ok || (res.status >= 300 && res.status < 400)) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`server at ${ORIGIN} did not become ready within ${timeoutMs / 1000}s`)
}

if (!existsSync(resolve(WT, '.next/BUILD_ID'))) {
  console.error('negative-control FAIL: .next/BUILD_ID missing — run bun run build first')
  process.exit(2)
}

mkdirSync(outDir, { recursive: true })
const shots = resolve(outDir, 'shots')
mkdirSync(shots, { recursive: true })

const server = spawn('node_modules/.bin/next', ['start', '-p', String(PORT)], {
  cwd: WT,
  env: { ...process.env, APP_ENV: 'development' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`))
const cleanup = async () => {
  try {
    server.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 400))
    try { server.kill('SIGKILL') } catch {}
  } catch {}
}
process.on('SIGINT', () => { cleanup(); process.exit(1) })

/** The exact assertion g4-route-diff.mjs enforces at capture time. */
const verdictOf = (probe) => (probe.count > 0 && probe.firstVisible ? 'PASS' : 'FAIL')

try {
  await waitForServer()
  console.log('negative-control: server ready')
  const browser = await launchBrowser()

  // Condition A — vacuous: ALL /api/* hung, including the session call
  // (the Phase-0 defect being guarded against).
  {
    const context = await newGateContext(browser)
    const page = await context.newPage()
    await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
    const res = await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST' })
    if (!res.ok) throw new Error(`demo auth failed: ${res.status}`)
    const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]
    const m = (raw || []).join('\n').match(/aics_session=([^;]+)/)
    if (!m) throw new Error('demo auth did not set aics_session')
    await context.addCookies([{ name: SESSION_COOKIE, value: m[1], url: ORIGIN }])
    await page.route('**/api/**', () => undefined) // hang EVERYTHING, session included
    await page.goto(`${ORIGIN}${SKELETON_ROUTE}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const probe = await skeletonPresence(page)
    await page.screenshot({ path: resolve(shots, 'A-vacuous.png'), fullPage: true })
    console.log(`  A vacuous (all /api hung incl. session): count=${probe.count} firstVisible=${probe.firstVisible} -> ${verdictOf(probe)} (expected FAIL)`)
    var conditionA = { label: 'A vacuous — all /api hung including /api/auth/session (the Phase-0 defect)', probe, verdict: verdictOf(probe), expected: 'FAIL', shot: 'shots/A-vacuous.png' }
    await context.close()
  }

  // Condition B — real: data APIs hang, session answered (the G4 condition),
  // then condition C reuses the same page with the skeletons hidden.
  let conditionB
  let conditionC
  {
    const context = await newGateContext(browser)
    const page = await context.newPage()
    await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
    const res = await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST' })
    if (!res.ok) throw new Error(`demo auth failed: ${res.status}`)
    const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]
    const m = (raw || []).join('\n').match(/aics_session=([^;]+)/)
    if (!m) throw new Error('demo auth did not set aics_session')
    await context.addCookies([{ name: SESSION_COOKIE, value: m[1], url: ORIGIN }])
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('/api/auth/session')) {
        return route.continue()
      }
      return undefined // hang
    })
    await page.goto(`${ORIGIN}${SKELETON_ROUTE}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const probe = await skeletonPresence(page)
    await page.screenshot({ path: resolve(shots, 'B-real.png'), fullPage: true })
    console.log(`  B real (data hung, session answered): count=${probe.count} firstVisible=${probe.firstVisible} -> ${verdictOf(probe)} (expected PASS)`)
    conditionB = { label: 'B real — data APIs hung, /api/auth/session answered (the G4 capture condition)', probe, verdict: verdictOf(probe), expected: 'PASS', shot: 'shots/B-real.png' }

    // Condition C — hidden: same page, .aics-skeleton display:none injected.
    await page.addStyleTag({ content: '.aics-skeleton { display: none !important; }' })
    await page.waitForTimeout(300)
    const probeC = await skeletonPresence(page)
    await page.screenshot({ path: resolve(shots, 'C-hidden.png'), fullPage: true })
    console.log(`  C hidden (B + .aics-skeleton display:none): count=${probeC.count} firstVisible=${probeC.firstVisible} -> ${verdictOf(probeC)} (expected FAIL)`)
    conditionC = { label: 'C hidden — B plus injected .aics-skeleton display:none (DOM present, not rendered)', probe: probeC, verdict: verdictOf(probeC), expected: 'FAIL', shot: 'shots/C-hidden.png' }
    await context.close()
  }

  await browser.close()

  const conditions = [conditionA, conditionB, conditionC]
  const pass = conditions.every((c) => c.verdict === c.expected)
  writeFileSync(
    resolve(outDir, 'report.json'),
    JSON.stringify(
      {
        gate: 'G4 skeleton-presence negative control (Stage 2A, issue #92 follow-up)',
        predicate: 'skeletonPresence() imported from scripts/theme/lib.mjs — the exact function g4-route-diff.mjs enforces at capture time',
        conditions,
        expectedPattern: 'A FAIL / B PASS / C FAIL',
        head: headSha(),
        pass,
      },
      null,
      2,
    ) + '\n',
  )
  writeManifest(outDir, [
    `command: ${invocationLine('g4-skeleton-negative.mjs')}`,
    `exit code: ${pass ? 0 : 1}`,
    `A vacuous: ${conditionA.verdict} (count=${conditionA.probe.count}, firstVisible=${conditionA.probe.firstVisible}; expected FAIL) — every /api/* request hung INCLUDING /api/auth/session, the exact Phase-0 defect`,
    `B real: ${conditionB.verdict} (count=${conditionB.probe.count}, firstVisible=${conditionB.probe.firstVisible}; expected PASS) — data APIs hung, session answered, the exact G4 capture condition`,
    `C hidden: ${conditionC.verdict} (count=${conditionC.probe.count}, firstVisible=${conditionC.probe.firstVisible}; expected FAIL) — B plus an injected .aics-skeleton display:none style (in-page only; the page context is closed right after, so the application, harness, and database are untouched)`,
    `server: ${ORIGIN} (next start on the dev worktree, APP_ENV=development); isolated: the harness, worktree, and database were never modified; read-only requests plus the dev demo login only; screenshots retained under shots/`,
  ])
  console.log(`\nnegative-control ${pass ? 'PASS' : 'FAIL'}: A=${conditionA.verdict} B=${conditionB.verdict} C=${conditionC.verdict} (expected A=FAIL B=PASS C=FAIL)`)
  if (!pass) process.exitCode = 1
} catch (e) {
  console.error(`negative-control FAIL: ${String(e).slice(0, 300)}`)
  process.exitCode = 1
} finally {
  await cleanup()
}
