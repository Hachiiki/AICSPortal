#!/usr/bin/env node
// Phase-1 controls functional verification (plan §6 "Controls checklist").
//
// Command:
//   GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase1 \
//   bun scripts/theme/phase1-controls-check.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase1/controls/
//
// Drives each of the four controls in each mode and asserts, per the plan:
//   - switches all three modes (Settings selector: light/dark/system);
//   - the topbar toggle and login toggle cycle light/dark;
//   - persists via aics_theme across refresh;
//   - consistent across tabs (storage event, no reload);
//   - follows OS changes live in System mode (emulated colorScheme flip);
//   - no FOUC under a throttled first paint (class + computed bg checked
//     at domcontentloaded, screenshot retained);
//   - the canvas computed background-color matches the resolved theme;
//   - the settings selector is reachable within 2 interactions from an
//     authenticated surface (sidebar Settings -> Appearance tab).
//
// Requires .next/BUILD_ID in the dev worktree (bun run build first) and
// MongoDB with the seeded demo dataset (.env.local + seed script).
//
// Exits non-zero on any failed assertion; every step is recorded.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { SignJWT } from 'jose'
import { chromium } from 'playwright'
import { WT, headSha, writeManifest, invocationLine, resolve } from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase1/controls'))

const PORT = 4300
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
function step(control, desc, ok, detail = '') {
  if (!ok) failures++
  results.push({ control, desc, ok, detail })
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  [${control}] ${desc}${detail ? ` — ${detail}` : ''}`)
}

async function mintSession(username, role) {
  return new SignJWT({ role, branch: BRANCH, tv: 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(DEV_SECRET))
}

const DARK_L_MAX = 10 // oklch(0.185 ...) serializes as lab(5.69% ...) in computed values
const LIGHT_L_MIN = 99 // oklch(1 0 0) serializes as lab(100 ...)

// Chrome reserializes computed colors (oklch -> lab), so read the leading
// lightness component of whatever notation the browser returns for the
// --background token on <html> and threshold it. This is notation-agnostic
// and directly proves the .dark cascade flipped the canvas token.
async function canvasIsDark(page) {
  const v = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--background').trim())
  const m = v.match(/-?\d+(?:\.\d+)?/)
  if (!m) return { ok: false, v }
  let l = parseFloat(m[0])
  if (v.includes('%') && l > 1) l = l // lab percentages arrive as e.g. 5.6913%
  return { ok: true, l, v: v.replace(/\s+/g, ' ') }
}

// ---------------------------------------------------------------------------
// server
// ---------------------------------------------------------------------------
if (!existsSync(resolve(WT, '.next/BUILD_ID'))) {
  console.error('controls-check FAIL: .next/BUILD_ID missing — run bun run build first')
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
  throw new Error('controls server did not become ready')
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function studentLogin(origin) {
  const res = await fetch(`${origin}/api/auth/demo`, { method: 'POST' })
  if (!res.ok) throw new Error(`demo auth failed: ${res.status}`)
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')]
  const m = (raw || []).join('\n').match(/aics_session=([^;]+)/)
  if (!m) throw new Error('demo auth did not set aics_session')
  return m[1]
}

async function themeState(page) {
  return page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    colorScheme: document.documentElement.style.colorScheme || '',
    stored: localStorage.getItem('aics_theme'),
  }))
}

async function canvasBg(page) {
  // Retained for detail output: the raw computed --background token.
  return page
    .evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--background').trim())
    .then((v) => v.replace(/\s+/g, ' '))
}

// ---------------------------------------------------------------------------
// run
// ---------------------------------------------------------------------------

mkdirSync(outDir, { recursive: true })
const shots = resolve(outDir, 'shots')
mkdirSync(shots, { recursive: true })

try {
  await waitForServer()
  console.log('controls-check: server ready')

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--hide-scrollbars'] })

  // =========================================================================
  // C1 — ThemeProvider (engine)
  // =========================================================================
  console.log('\nC1 ThemeProvider (engine)')
  {
    // No FOUC, explicit dark preference, throttled first paint.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addInitScript(`localStorage.setItem('aics_theme', 'dark')`)
    const page = await ctx.newPage()
    await page.route('**/*', async (route) => {
      await new Promise((r) => setTimeout(r, 250)) // throttled first paint
      await route.continue()
    })
    await page.goto(`${ORIGIN}/portal/login`, { waitUntil: 'domcontentloaded' })
    const st = await themeState(page)
    const c = await canvasIsDark(page)
    await page.screenshot({ path: resolve(shots, 'c1-nofouc-dark-throttled.png'), fullPage: false })
    step('C1', 'no FOUC with stored dark preference under throttled first paint (class set + dark canvas at domcontentloaded)', st.dark === true && c.ok && c.l <= DARK_L_MAX, `dark=${st.dark} bg=${c.v}`)
    await page.waitForTimeout(600)
    const st2 = await themeState(page)
    step('C1', 'stored preference resolves dark after full load too', st2.dark === true && st2.stored === 'dark', JSON.stringify(st2))
    await ctx.close()
  }
  {
    // No FOUC via SYSTEM preference (OS dark), no stored value.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'dark' })
    const page = await ctx.newPage()
    await page.route('**/*', async (route) => {
      await new Promise((r) => setTimeout(r, 250))
      await route.continue()
    })
    await page.goto(`${ORIGIN}/portal/login`, { waitUntil: 'domcontentloaded' })
    const st = await themeState(page)
    const c = await canvasIsDark(page)
    await page.screenshot({ path: resolve(shots, 'c1-nofouc-system-dark-throttled.png'), fullPage: false })
    step('C1', 'no FOUC with system dark and no stored value (defaultTheme=system resolves pre-paint)', st.dark === true && c.ok && c.l <= DARK_L_MAX, `dark=${st.dark} bg=${c.v}`)
    await ctx.close()
  }
  {
    // Light default: no stored value, OS light -> light, and the provider
    // stamps color-scheme on <html>.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    const page = await ctx.newPage()
    await page.goto(`${ORIGIN}/portal/login`, { waitUntil: 'networkidle' })
    const st = await themeState(page)
    const c = await canvasIsDark(page)
    step('C1', 'light default renders light with color-scheme hint', st.dark === false && c.ok && c.l >= LIGHT_L_MIN && st.colorScheme === 'light', JSON.stringify(st) + ` bg=${c.v}`)
    await ctx.close()
  }

  // =========================================================================
  // C4 — Login-page toggle (runs pre-auth; also seeds persistence checks)
  // =========================================================================
  console.log('\nC4 Login-page toggle')
  const loginCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
  {
    const page = await loginCtx.newPage()
    await page.goto(`${ORIGIN}/portal/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    const toggle = page.locator('button[aria-label="Switch to dark theme"]')
    step('C4', 'login toggle present and reachable pre-authentication', await toggle.count() === 1)
    await toggle.click()
    await page.waitForTimeout(250)
    let st = await themeState(page)
    const c = await canvasIsDark(page)
    await page.screenshot({ path: resolve(shots, 'c4-login-dark.png'), fullPage: false })
    step('C4', 'login toggle switches to dark (class + canvas + aics_theme)', st.dark === true && c.ok && c.l <= DARK_L_MAX && st.stored === 'dark', `bg=${c.v}`)
    // Persistence across refresh on the login surface.
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    st = await themeState(page)
    const c2 = await canvasIsDark(page)
    step('C4', 'dark persists across login-page refresh', st.dark === true && st.stored === 'dark' && c2.ok && c2.l <= DARK_L_MAX, `bg=${c2.v}`)
    // Toggle back to light.
    const toggle2 = page.locator('button[aria-label="Switch to light theme"]')
    step('C4', 'login toggle relabels per resolved theme', await toggle2.count() === 1)
    await toggle2.click()
    await page.waitForTimeout(250)
    st = await themeState(page)
    step('C4', 'login toggle switches back to light', st.dark === false && st.stored === 'light', JSON.stringify(st))
    await page.screenshot({ path: resolve(shots, 'c4-login-light.png'), fullPage: false })
  }

  // =========================================================================
  // C3 — Topbar toggle on every role's authenticated surface
  // =========================================================================
  console.log('\nC3 Topbar toggle')
  const studentCookie = await studentLogin(ORIGIN)
  const facultyToken = await mintSession(FACULTY, 'faculty')
  const adminToken = await mintSession(ADMIN, 'admin')
  for (const [role, url, cookie] of [
    ['student', studentBase, studentCookie],
    ['faculty', facultyBase, facultyToken],
    ['admin', adminBase, adminToken],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addCookies([{ name: 'aics_session', value: cookie, url: ORIGIN }])
    const page = await ctx.newPage()
    await page.goto(`${ORIGIN}${url}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const path = new URL(page.url()).pathname
    if (path === '/portal/login') {
      step('C3', `${role} session accepted`, false, 'redirected to login')
      await ctx.close()
      continue
    }
    step('C3', `${role} session accepted`, true)
    const toggle = page.locator('button[aria-label="Switch to dark theme"]')
    const present = await toggle.count() === 1
    step('C3', `topbar toggle present on ${role} surface (0 interactions)`, present)
    if (present) {
      await toggle.click()
      await page.waitForTimeout(300)
      const st = await themeState(page)
      const c = await canvasIsDark(page)
      await page.screenshot({ path: resolve(shots, `c3-${role}-dark.png`), fullPage: false })
      step('C3', `topbar toggle switches ${role} surface to dark`, st.dark === true && st.stored === 'dark' && c.ok && c.l <= DARK_L_MAX, `bg=${c.v}`)
      const back = page.locator('button[aria-label="Switch to light theme"]')
      await back.click()
      await page.waitForTimeout(300)
      const st2 = await themeState(page)
      step('C3', `topbar toggle cycles back to light on ${role} surface`, st2.dark === false && st2.stored === 'light', JSON.stringify(st2))
    }
    await ctx.close()
  }

  // =========================================================================
  // C2 — Settings appearance selector (Light / Dark / System)
  // =========================================================================
  console.log('\nC2 Settings appearance selector')
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addCookies([{ name: 'aics_session', value: studentCookie, url: ORIGIN }])
    const page = await ctx.newPage()
    // Reachability from an authenticated surface: dashboard -> sidebar
    // Settings link -> Appearance tab (2 interactions).
    await page.goto(`${ORIGIN}${studentBase}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)
    const settingsNav = page.locator('a[href*="/settings"], button:has-text("Settings")').first()
    const navOk = (await settingsNav.count()) > 0
    step('C2', 'Settings reachable from the dashboard sidebar (interaction 1)', navOk)
    if (navOk) await settingsNav.click()
    await page.waitForTimeout(700)
    const tab = page.locator('button[role="tab"]:has-text("Appearance")')
    const tabOk = (await tab.count()) === 1
    step('C2', 'Appearance tab present in Settings (interaction 2)', tabOk)
    if (!tabOk) {
      await ctx.close()
    } else {
      await tab.click()
      await page.waitForTimeout(300)
      const group = page.locator('[role="radiogroup"][aria-label="Theme"]')
      step('C2', 'appearance radiogroup renders with three options', (await group.locator('input[type="radio"]').count()) === 3)
      await page.screenshot({ path: resolve(shots, 'c2-settings-appearance.png'), fullPage: false })

      // Light
      await page.locator('label:has(input[value="light"])').click()
      await page.waitForTimeout(250)
      let st = await themeState(page)
      step('C2', 'selector: Light mode applies + persists key', st.dark === false && st.stored === 'light', JSON.stringify(st))

      // Dark
      await page.locator('label:has(input[value="dark"])').click()
      await page.waitForTimeout(250)
      st = await themeState(page)
      const c = await canvasIsDark(page)
      await page.screenshot({ path: resolve(shots, 'c2-settings-dark-selected.png'), fullPage: false })
      step('C2', 'selector: Dark mode applies (class + canvas + key)', st.dark === true && st.stored === 'dark' && c.ok && c.l <= DARK_L_MAX, JSON.stringify(st) + ` bg=${c.v}`)

      // System, following the emulated OS (light at this moment)
      await page.locator('label:has(input[value="system"])').click()
      await page.waitForTimeout(250)
      st = await themeState(page)
      step('C2', 'selector: System mode stores "system" and resolves per OS (light)', st.stored === 'system' && st.dark === false, JSON.stringify(st))

      // Live OS flip in System mode, WITHOUT reload.
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForTimeout(500)
      st = await themeState(page)
      const cDark = await canvasIsDark(page)
      await page.screenshot({ path: resolve(shots, 'c2-system-os-flip-dark.png'), fullPage: false })
      step('C2', 'System mode follows a live OS theme change without reload', st.dark === true && cDark.ok && cDark.l <= DARK_L_MAX, JSON.stringify(st) + ` bg=${cDark.v}`)
      await page.emulateMedia({ colorScheme: 'light' })
      await page.waitForTimeout(500)
      st = await themeState(page)
      step('C2', 'System mode follows the OS back to light without reload', st.dark === false, JSON.stringify(st))

      // Persistence across refresh in System mode.
      await page.reload({ waitUntil: 'networkidle' })
      await page.waitForTimeout(400)
      st = await themeState(page)
      step('C2', 'System preference persists across refresh', st.stored === 'system' && st.dark === false, JSON.stringify(st))
      await ctx.close()
    }
  }

  // =========================================================================
  // Cross-tab consistency (storage event; no reload on the second tab)
  // =========================================================================
  console.log('\nCross-tab consistency')
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addCookies([{ name: 'aics_session', value: studentCookie, url: ORIGIN }])
    const page1 = await ctx.newPage()
    const page2 = await ctx.newPage()
    await page1.goto(`${ORIGIN}${studentBase}`, { waitUntil: 'networkidle' })
    await page2.goto(`${ORIGIN}${studentBase}/events`, { waitUntil: 'networkidle' })
    await page1.waitForTimeout(400)
    await page2.waitForTimeout(400)
    await page1.locator('button[aria-label="Switch to dark theme"]').click()
    await page1.waitForTimeout(500)
    const st1 = await themeState(page1)
    const st2 = await themeState(page2)
    await page1.screenshot({ path: resolve(shots, 'multitab-page1-dark.png'), fullPage: false })
    await page2.screenshot({ path: resolve(shots, 'multitab-page2-dark.png'), fullPage: false })
    step('cross', 'tab 1 toggles dark; tab 2 follows via the storage event without reload', st1.dark === true && st2.dark === true, `tab1=${JSON.stringify(st1)} tab2=${JSON.stringify(st2)}`)
    await page1.locator('button[aria-label="Switch to light theme"]').click()
    await page1.waitForTimeout(500)
    const st2b = await themeState(page2)
    step('cross', 'tab 2 follows back to light', st2b.dark === false, JSON.stringify(st2b))
    await ctx.close()
  }

  await browser.close()

  // -------------------------------------------------------------------------
  // evidence
  // -------------------------------------------------------------------------
  const report = {
    gate: 'Phase-1 controls functional verification (plan §6 controls checklist)',
    head: headSha(),
    controls: {
      'C1 ThemeProvider': results.filter((r) => r.control === 'C1').length,
      'C2 Settings appearance selector': results.filter((r) => r.control === 'C2').length,
      'C3 Topbar toggle': results.filter((r) => r.control === 'C3').length,
      'C4 Login-page toggle': results.filter((r) => r.control === 'C4').length,
      'cross-tab': results.filter((r) => r.control === 'cross').length,
    },
    stepsTotal: results.length,
    stepsPassing: results.filter((r) => r.ok).length,
    failures,
    results,
  }
  writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(report, null, 2))
  writeManifest(outDir, [
    `command: ${invocationLine('phase1-controls-check.mjs')}`,
    `exit code: ${failures ? 1 : 0}`,
    `steps: ${results.length} (${failures} failures)`,
    'server: next start on 127.0.0.1:4300 (APP_ENV=development, production build); student session via POST /api/auth/demo; faculty/admin via dev-fallback-secret JWT (DB-validated)',
    'environment: headless Chromium 1280x800, colorScheme driven per check (light default; dark for the system-mode and no-FOUC system cases); throttled first paint = 250ms delay on every request for the no-FOUC checks',
    'assertions: documentElement.classList, localStorage aics_theme, documentElement.style.colorScheme, and the lightness of the computed --background token on <html> (Chrome reserializes oklch as lab(); the leading component is thresholded: dark <= 10, light >= 99, which proves the .dark cascade flipped the canvas token)',
  ])

  console.log(`\nControls check: ${results.filter((r) => r.ok).length}/${results.length} steps pass (${failures} failures)`)
  if (failures) process.exitCode = 1
  else console.log('Controls check PASS: all four controls functional')
} finally {
  await cleanup()
}
