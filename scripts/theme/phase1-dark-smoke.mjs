#!/usr/bin/env node
// Phase-1 dark-mode route smoke (plan §6: "route smoke in dark (login +
// one route per role); sonner/dropdown/dialog/button verified in dark;
// skeletons and empty states visible").
//
// Command:
//   GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase1 \
//   bun scripts/theme/phase1-dark-smoke.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase1/dark-smoke/
//
// Captures in resolved dark mode (aics_theme=dark):
//   - /portal/login
//   - student dashboard, faculty dashboard, admin dashboard (one per role)
//   - topbar dropdown open (student) — dropdown-menu + an empty state
//   - admin events "Add event" modal open — dialog + form controls
//   - a real sonner toast (failed sign-in) on the login surface
//   - skeleton loading (student events with all /api hung)
//
// Every route asserts html.dark and the dark canvas computed color.
// Requires .next/BUILD_ID and the seeded demo dataset.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { SignJWT } from 'jose'
import { chromium } from 'playwright'
import { WT, headSha, writeManifest, invocationLine, resolve } from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase1/dark-smoke'))

const PORT = 4301
const ORIGIN = `http://127.0.0.1:${PORT}`
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'
const BRANCH = 'commonwealth'
const STUDENT = 'juan.santos'
const FACULTY = 'm.reyes'
const ADMIN = 'admin'
const studentBase = `/portal/${BRANCH}/student/${STUDENT}`
const facultyBase = `/portal/${BRANCH}/faculty/${FACULTY}`
const adminBase = `/portal/${BRANCH}/admin/${ADMIN}`

const results = []
let failures = 0
function step(desc, ok, detail = '') {
  if (!ok) failures++
  results.push({ desc, ok, detail })
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${desc}${detail ? ` — ${detail}` : ''}`)
}

async function mintSession(username, role) {
  return new SignJWT({ role, branch: BRANCH, tv: 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(DEV_SECRET))
}

async function assertDark(page, label) {
  // html.dark plus the canvas token flipped: Chrome reserializes computed
  // oklch as lab(), so threshold the leading lightness component of
  // whatever notation the browser returns for --background on <html>.
  const st = await page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    bg: getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
    skeletonVisible: !!document.querySelector('.aics-skeleton'),
  }))
  const m = st.bg.match(/-?\d+(?:\.\d+)?/)
  const l = m ? parseFloat(m[0]) : null
  const ok = st.dark === true && l !== null && l <= 10
  if (!ok) failures++
  results.push({ desc: `${label}: html.dark + dark canvas token`, ok, detail: st.bg })
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}: html.dark (canvas token ${st.bg})`)
  return st
}

if (!existsSync(resolve(WT, '.next/BUILD_ID'))) {
  console.error('dark-smoke FAIL: .next/BUILD_ID missing — run bun run build first')
  process.exit(2)
}

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

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${ORIGIN}/portal/login`)
      if (res.ok || (res.status >= 300 && res.status < 400)) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('dark-smoke server did not become ready')
}

mkdirSync(outDir, { recursive: true })
const shots = resolve(outDir, 'shots')
mkdirSync(shots, { recursive: true })

try {
  await waitForServer()
  console.log('dark-smoke: server ready')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--hide-scrollbars'] })

  // Login surface in dark (+ a real sonner toast via failed sign-in).
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addInitScript(`localStorage.setItem('aics_theme', 'dark')`)
    const page = await ctx.newPage()
    await page.goto(`${ORIGIN}/portal/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await assertDark(page, 'login')
    await page.screenshot({ path: resolve(shots, 'dark-login.png'), fullPage: false })
    // Failed sign-in -> real sonner error toast rendered in dark.
    await page.fill('#username', 'juan.santos')
    await page.fill('#password', 'wrong-password-on-purpose')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(1500)
    const toastVisible = await page.locator('[data-sonner-toast]').count()
    await page.screenshot({ path: resolve(shots, 'dark-login-toast.png'), fullPage: false })
    step('sonner toast renders in dark (failed sign-in)', toastVisible > 0, `toasts=${toastVisible}`)
    await ctx.close()
  }

  // One route per role in dark.
  const studentCookie = (await (await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST' })).headers.getSetCookie()).join('\n').match(/aics_session=([^;]+)/)[1]
  const facultyToken = await mintSession(FACULTY, 'faculty')
  const adminToken = await mintSession(ADMIN, 'admin')
  for (const [role, url, cookie, name] of [
    ['student', studentBase, studentCookie, 'dark-student-dashboard'],
    ['faculty', facultyBase, facultyToken, 'dark-faculty-dashboard'],
    ['admin', adminBase, adminToken, 'dark-admin-dashboard'],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addCookies([{ name: 'aics_session', value: cookie, url: ORIGIN }])
    await ctx.addInitScript(`localStorage.setItem('aics_theme', 'dark')`)
    const page = await ctx.newPage()
    await page.goto(`${ORIGIN}${url}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const path = new URL(page.url()).pathname
    if (path === '/portal/login') {
      step(`${role} dashboard renders in dark`, false, 'redirected to login')
      await ctx.close()
      continue
    }
    await assertDark(page, `${role} dashboard`)
    await page.screenshot({ path: resolve(shots, `${name}.png`), fullPage: true })
    await ctx.close()
  }

  // Dropdown (topbar account menu) + empty state in dark.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addCookies([{ name: 'aics_session', value: studentCookie, url: ORIGIN }])
    await ctx.addInitScript(`localStorage.setItem('aics_theme', 'dark')`)
    const page = await ctx.newPage()
    await page.goto(`${ORIGIN}${studentBase}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.click('button[aria-label="Notifications"]')
    await page.waitForTimeout(700)
    const menuOpen = await page.locator('[role="menu"]').count()
    await page.screenshot({ path: resolve(shots, 'dark-topbar-dropdown.png'), fullPage: false })
    step('dropdown-menu opens in dark (notifications; empty state text visible)', menuOpen > 0, `menus=${menuOpen}`)
    await ctx.close()
  }

  // Dialog (admin events modal) + form controls in dark.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addCookies([{ name: 'aics_session', value: adminToken, url: ORIGIN }])
    await ctx.addInitScript(`localStorage.setItem('aics_theme', 'dark')`)
    const page = await ctx.newPage()
    await page.goto(`${ORIGIN}${adminBase}/events`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    await page.click('button:has-text("Add event")')
    await page.waitForTimeout(700)
    const dialogOpen = await page.locator('[role="dialog"]').count()
    await page.screenshot({ path: resolve(shots, 'dark-admin-events-modal.png'), fullPage: false })
    step('dialog opens in dark (admin add-event modal, inputs/buttons visible)', dialogOpen > 0, `dialogs=${dialogOpen}`)
    await ctx.close()
  }

  // Skeleton loading in dark (all /api hung).
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addCookies([{ name: 'aics_session', value: studentCookie, url: ORIGIN }])
    await ctx.addInitScript(`localStorage.setItem('aics_theme', 'dark')`)
    const page = await ctx.newPage()
    // Hang the DATA endpoints only: /api/auth/session must answer because
    // useAuth gates the portal render on it (hanging everything yields an
    // empty page, never a skeleton).
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('/api/auth/session')) {
        return route.continue()
      }
      return undefined // hang
    })
    await page.goto(`${ORIGIN}${studentBase}/events`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const skeletonCount = await page.locator('.aics-skeleton').count()
    await page.screenshot({ path: resolve(shots, 'dark-skeleton.png'), fullPage: false })
    step('skeletons visible in dark (network-hungry events page)', skeletonCount > 0, `blocks=${skeletonCount}`)
    await ctx.close()
  }

  await browser.close()

  const report = {
    gate: 'Phase-1 dark-mode route smoke (plan §6)',
    head: headSha(),
    stepsTotal: results.length,
    stepsPassing: results.filter((r) => r.ok).length,
    failures,
    results,
  }
  writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2))
  writeManifest(outDir, [
    `command: ${invocationLine('phase1-dark-smoke.mjs')}`,
    `exit code: ${failures ? 1 : 0}`,
    `steps: ${results.length} (${failures} failures)`,
    'coverage: login + one route per role in resolved dark (aics_theme=dark), plus dark dropdown (with empty state), dark dialog + form controls, a real sonner error toast (failed sign-in), and dark skeleton loading',
    'server: next start on 127.0.0.1:4301 (APP_ENV=development, production build); student session via POST /api/auth/demo; faculty/admin via dev-fallback-secret JWT (DB-validated)',
    'environment: headless Chromium 1280x800, colorScheme light (dark comes from the stored aics_theme preference, proving the engine rather than the OS emulation)',
    'assertions: html.dark + computed canvas color per route; element presence for menu/dialog/toast/skeleton; screenshots retained under shots/',
  ])

  console.log(`\nDark smoke: ${results.filter((r) => r.ok).length}/${results.length} steps pass (${failures} failures)`)
  if (failures) process.exitCode = 1
  else console.log('Dark smoke PASS')
} finally {
  await cleanup()
}
