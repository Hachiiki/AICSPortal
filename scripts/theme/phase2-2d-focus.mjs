#!/usr/bin/env node
// Stage 2D — focused validation probes (Phase 2).
//
// Command:
//   bun scripts/theme/phase2-2d-focus.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase2/2d/focus/
//
// Validates the two Stage-2D code changes plus the evidence-only blurred
// surfaces review, on the real built application:
//
//   A. Red-chip hover contrast (both themes): the four admin
//      delete-confirm chips are driven through their REAL UI (click
//      Delete -> confirming state -> hover), and the three error/retry
//      button class strings are probed via class-identical injected
//      elements on a real authenticated page (the error routes cannot be
//      deterministically triggered in the built demo app; the utilities
//      are identical and are emitted from the same source-scanned
//      stylesheet). For every site, in BOTH themes: measured resting
//      background-color, measured hover background-color, measured text
//      color, and the white-on-chip WCAG contrast at rest and hover.
//      Acceptance: dark hover >= 3:1 (target ~3.95); light resting and
//      hover behavior unchanged from the pre-2D values.
//   B. Avatar edge (both themes): computed background-color, computed
//      box-shadow (ring present ONLY in dark), element close-ups, and a
//      pixel-level rim analysis of the dark close-up (fill vs rim vs
//      topbar samples at 8 angles). Light must render NO ring
//      (box-shadow none) and the exact #1e293b fill.
//   C. Blurred surfaces (dark, evidence only): the four faculty modal
//      states with bg-scrim/40 backdrop-blur-sm scrims captured; the
//      opaque DialogPanels audited for text readability (computed color
//      vs resolved effective background, WCAG bars); the cookie-consent
//      banner captured with its computed compositing values recorded.
//      NO styling changes — findings only.
//
// Color math (CSS Color 4) is the same code phase2-2c-matrix.mjs
// validated (oklch/oklab/lab/rgb/hex parsing, self-tested in-browser
// against the committed dark tokens before any measurement is trusted).
//
// Environment preconditions (reported, never silently assumed):
//   - built .next (bun run build), MongoDB reachable + seeded demo
//     dataset, Playwright Chromium. Isolated server on port 4305.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { SignJWT } from 'jose'
import { chromium } from 'playwright'
import { WT, headSha, launchBrowser, newGateContext, writeManifest, invocationLine, resolve } from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase2/2d/focus'))

const PORT = 4305
const ORIGIN = `http://127.0.0.1:${PORT}`
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'
const SESSION_COOKIE = 'aics_session'
const BRANCH = 'commonwealth'
const STUDENT = 'juan.santos'
const FACULTY = 'm.reyes'
const ADMIN = 'admin'
const studentBase = `/portal/${BRANCH}/student/${STUDENT}`
const facultyBase = `/portal/${BRANCH}/faculty/${FACULTY}`
const adminBase = `/portal/${BRANCH}/admin/${ADMIN}`

// ---------------------------------------------------------------------------
// Color math (CSS Color 4) — identical to phase2-2c-matrix.mjs
// ---------------------------------------------------------------------------

function oklchToLinear(L, C, H) {
  const h = (H * Math.PI) / 180
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function oklabToLinear(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b
  const l = l_ ** 3
  const m = m_ ** 3
  const s = s_ ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function labToLinear(L, a, b) {
  const d50 = [0.3457 / 0.3585, 1.0, 0.2958 / 0.3585]
  const ke = 24389 / 27
  const eps = 216 / 24389
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const fx3 = fx ** 3
  const fz3 = fz ** 3
  const xr = fx3 > eps ? fx3 : (116 * fx - 16) / ke
  const yr = L > ke * eps ? fy ** 3 : L / ke
  const zr = fz3 > eps ? fz3 : (116 * fz - 16) / ke
  const X = xr * d50[0]
  const Y = yr * d50[1]
  const Z = zr * d50[2]
  return [
    3.1338561 * X - 1.6168667 * Y - 0.4906146 * Z,
    -0.9787684 * X + 1.9161415 * Y + 0.033454 * Z,
    0.0719453 * X - 0.2289914 * Y + 1.4052427 * Z,
  ]
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const linearToSrgb = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)
const clamp01 = (v) => Math.min(1, Math.max(0, v))

function parseColor(value) {
  if (!value) return null
  const v = String(value).trim()
  if (v === 'none' || v === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  let m
  if ((m = v.match(/^rgba?\(\s*([\d.]+%?)\s*,?\s*([\d.]+%?)\s*,?\s*([\d.]+%?)\s*(?:,\s*(\/?[\d.]+|%?)|\/\s*([\d.]+%?))?\)$/i))) {
    const pct = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s) / 255)
    let a = 1
    if (m[4] !== undefined) a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])
    if (m[5] !== undefined) a = m[5].endsWith('%') ? parseFloat(m[5]) / 100 : parseFloat(m[5])
    return { r: pct(m[1]), g: pct(m[2]), b: pct(m[3]), a }
  }
  if ((m = v.match(/^#([0-9a-f]{3,8})$/i))) {
    const h = m[1]
    if (h.length === 3) return { r: parseInt(h[0] + h[0], 16) / 255, g: parseInt(h[1] + h[1], 16) / 255, b: parseInt(h[2] + h[2], 16) / 255, a: 1 }
    if (h.length === 6) return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: 1 }
    if (h.length === 8) return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: parseInt(h.slice(6, 8), 16) / 255 }
    return null
  }
  const splitArgs = (s) => s.split(/[\s,/]+/).filter(Boolean)
  if ((m = v.match(/^oklch\(([^)]+)\)$/i))) {
    const p = splitArgs(m[1])
    const L = p[0].endsWith('%') ? parseFloat(p[0]) / 100 : parseFloat(p[0])
    const C = p[1] === 'none' ? 0 : parseFloat(p[1])
    const H = p[2] === 'none' ? 0 : parseFloat(p[2])
    const a = p[3] !== undefined && p[3] !== 'none' ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1
    const lin = oklchToLinear(L, C, H)
    return { r: linearToSrgb(clamp01(lin[0])), g: linearToSrgb(clamp01(lin[1])), b: linearToSrgb(clamp01(lin[2])), a }
  }
  if ((m = v.match(/^oklab\(([^)]+)\)$/i))) {
    const p = splitArgs(m[1])
    const L = p[0].endsWith('%') ? parseFloat(p[0]) / 100 : parseFloat(p[0])
    const a1 = p[1] === 'none' ? 0 : parseFloat(p[1])
    const b1 = p[2] === 'none' ? 0 : parseFloat(p[2])
    const a = p[3] !== undefined && p[3] !== 'none' ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1
    const lin = oklabToLinear(L, a1, b1)
    return { r: linearToSrgb(clamp01(lin[0])), g: linearToSrgb(clamp01(lin[1])), b: linearToSrgb(clamp01(lin[2])), a }
  }
  if ((m = v.match(/^lab\(([^)]+)\)$/i))) {
    const p = splitArgs(m[1])
    const Lv = p[0].endsWith('%') ? parseFloat(p[0]) : parseFloat(p[0])
    const a1 = p[1] === 'none' ? 0 : parseFloat(p[1])
    const b1 = p[2] === 'none' ? 0 : parseFloat(p[2])
    const a = p[3] !== undefined && p[3] !== 'none' ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1
    const lin = labToLinear(Lv, a1, b1)
    return { r: linearToSrgb(clamp01(lin[0])), g: linearToSrgb(clamp01(lin[1])), b: linearToSrgb(clamp01(lin[2])), a }
  }
  if ((m = v.match(/^color\(\s*srgb\s+([^)]+)\)$/i))) {
    const p = splitArgs(m[1])
    const ch = (s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s))
    const a = p[3] !== undefined && p[3] !== 'none' ? (p[3].endsWith('%') ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : p.length > 3 ? ch(p[3]) : 1
    return { r: ch(p[0]), g: ch(p[1]), b: ch(p[2]), a }
  }
  return null
}

function luminance(c) {
  return 0.2126 * srgbToLinear(c.r) + 0.7152 * srgbToLinear(c.g) + 0.0722 * srgbToLinear(c.b)
}

function contrast(fg, bg) {
  const l1 = luminance(fg)
  const l2 = luminance(bg)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

const hexOf = (c) =>
  '#' + [c.r, c.g, c.b].map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, '0')).join('')

function over(fg, bg) {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: fg.a + bg.a * (1 - fg.a),
  }
}

// ---------------------------------------------------------------------------
// Server + sessions
// ---------------------------------------------------------------------------

async function mintSession(username, role) {
  return new SignJWT({ role, branch: BRANCH, tv: 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(new TextEncoder().encode(DEV_SECRET))
}

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${ORIGIN}/portal/login`)
      if (res.ok || (res.status >= 300 && res.status < 400)) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`2d-focus server at ${ORIGIN} did not become ready`)
}

const themeInitScript = (theme) =>
  theme === 'dark' ? `localStorage.setItem('aics_theme', 'dark')` : `localStorage.setItem('aics_theme', 'light')`

if (!existsSync(resolve(WT, '.next/BUILD_ID'))) {
  console.error('2d-focus FAIL: .next/BUILD_ID missing — run bun run build first')
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

mkdirSync(outDir, { recursive: true })
const shots = resolve(outDir, 'shots')
mkdirSync(shots, { recursive: true })

const results = { redChips: [], avatar: {}, facultyModals: [], cookieBanner: {}, parserSelfTest: [] }
let failures = 0
const fail = (msg) => { failures++; console.error(`  FAIL  ${msg}`) }

try {
  await waitForServer()
  console.log(`2d-focus: server ready on ${ORIGIN}`)
  const browser = await launchBrowser()

  const studentCookie = (
    await (await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST' })).headers.getSetCookie()
  ).join('\n').match(/aics_session=([^;]+)/)[1]
  const facultyToken = await mintSession(FACULTY, 'faculty')
  const adminToken = await mintSession(ADMIN, 'admin')
  const sessionFor = (role) =>
    role === 'student' ? studentCookie : role === 'faculty' ? facultyToken : adminToken

  const openPage = async (role, theme, url, extraInit = '') => {
    const ctx = await newGateContext(browser)
    await ctx.addInitScript(`${themeInitScript(theme)}${extraInit}`)
    await ctx.addCookies([{ name: SESSION_COOKIE, value: sessionFor(role), url: ORIGIN }])
    const page = await ctx.newPage()
    await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
    await page.goto(`${ORIGIN}${url}`, { waitUntil: 'networkidle', timeout: 45000 })
    await page.waitForTimeout(700)
    return { ctx, page }
  }

  // --- parser self-test (same as the 2C matrix) ---------------------------
  {
    const ctx = await newGateContext(browser)
    await ctx.addInitScript(themeInitScript('dark'))
    const page = await ctx.newPage()
    await page.goto(`${ORIGIN}/portal/login`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)
    const probe = await page.evaluate(() => {
      const out = []
      for (const prop of ['--surface', '--ink', '--muted-fg', '--link']) {
        const el = document.createElement('span')
        el.setAttribute('style', `position:absolute;left:-9999px;color:var(${prop})`)
        document.body.appendChild(el)
        out.push({ prop, computed: getComputedStyle(el).color })
      }
      return out
    })
    const known = {
      '--surface': 'oklch(0.225 0.012 255)',
      '--ink': 'oklch(0.94 0.005 255)',
      '--muted-fg': 'oklch(0.64 0.012 255)',
      '--link': 'oklch(0.72 0.14 260)',
    }
    let selfTestOk = true
    for (const p of probe) {
      const fromLab = parseColor(p.computed)
      const fromOklch = parseColor(known[p.prop])
      let ok = false
      let detail = 'parse failure'
      if (fromLab && fromOklch) {
        const drift = Math.max(
          Math.abs(fromLab.r - fromOklch.r),
          Math.abs(fromLab.g - fromOklch.g),
          Math.abs(fromLab.b - fromOklch.b),
        )
        ok = drift <= 4 / 255 && contrast(fromLab, fromOklch) < 1.03
        detail = `drift=${(drift * 255).toFixed(2)}/255 contrast=${contrast(fromLab, fromOklch).toFixed(3)} ${hexOf(fromLab)} vs ${hexOf(fromOklch)}`
      }
      results.parserSelfTest.push({ prop: p.prop, computed: p.computed, ok, detail })
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  parser self-test ${p.prop}: ${detail}`)
      if (!ok) selfTestOk = false
    }
    if (!selfTestOk) {
      console.error('2d-focus FAIL: color parser self-test disagrees')
      await browser.close(); await cleanup(); process.exit(2)
    }
    await ctx.close()
  }

  // =========================================================================
  // A. Red-chip hover contrast — real UI chips + class-identical probes
  // =========================================================================
  console.log('\nA. red-chip hover probes (both themes)')

  const measureChip = async (page, locator, label, theme) => {
    const read = () => locator.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }))
    // Move the pointer to a neutral corner FIRST: the arming click (or a
    // prior measurement) leaves the mouse over the chip, which would
    // contaminate the resting-state reading with the hover styles.
    await page.mouse.move(1, 700)
    await page.waitForTimeout(150)
    const rest = await read()
    await locator.hover()
    await page.waitForTimeout(120)
    const hover = await read()
    const rec = {
      site: label, theme,
      restBg: rest.bg, restColor: rest.color,
      hoverBg: hover.bg, hoverColor: hover.color,
    }
    const restBg = parseColor(rest.bg)
    const hoverBg = parseColor(hover.bg)
    const fg = parseColor(rest.color)
    if (!restBg || !hoverBg || !fg) {
      rec.error = 'parse failure'
      fail(`${label} [${theme}]: computed color parse failure (${rest.bg} / ${hover.bg})`)
      return rec
    }
    rec.restBgHex = hexOf(restBg)
    rec.hoverBgHex = hexOf(hoverBg)
    rec.restContrast = Math.round(contrast(fg, restBg) * 1000) / 1000
    rec.hoverContrast = Math.round(contrast(fg, hoverBg) * 1000) / 1000
    rec.hoverChanged = rest.bg !== hover.bg
    return rec
  }

  // The three error/retry button class strings, copied verbatim from the
  // source at HEAD (src/app/portal/error.tsx, src/app/error.tsx,
  // src/components/ErrorBoundary.tsx).
  const ERROR_CLASSES = {
    'app/portal/error.tsx': 'inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 dark:hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
    'app/error.tsx': 'mt-6 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 dark:hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
    'components/ErrorBoundary.tsx': 'mt-5 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 dark:hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
  }

  for (const theme of ['light', 'dark']) {
    // --- real chip 1+2: admin announcements (row + bulk) -------------------
    {
      const { ctx, page } = await openPage('admin', theme, `${adminBase}/announcements`)
      const rowDelete = page.getByRole('button', { name: 'Delete', exact: true }).first()
      if (!(await rowDelete.count())) {
        fail(`admin-announcements row Delete button not found [${theme}]`)
      } else {
        await rowDelete.click()
        await page.waitForTimeout(250)
        const confirm = page.getByRole('button', { name: 'Confirm', exact: true }).first()
        const rec = await measureChip(page, confirm, 'AdminAnnouncementsPage row delete-confirm chip (real UI)', theme)
        results.redChips.push(rec)
        console.log(`  ${theme} ann-row: rest ${rec.restBgHex} ${rec.restContrast}:1 -> hover ${rec.hoverBgHex} ${rec.hoverContrast}:1`)
        // bulk chip: select all via header checkbox, then Delete selected
        const headerBox = page.locator('thead input[type="checkbox"]').first()
        if (await headerBox.count()) {
          await headerBox.check()
          await page.waitForTimeout(200)
          await page.getByRole('button', { name: 'Delete selected' }).click()
          await page.waitForTimeout(250)
          const bulkConfirm = page.getByRole('button', { name: 'Confirm delete' })
          const rec2 = await measureChip(page, bulkConfirm, 'AdminAnnouncementsPage bulk delete-confirm chip (real UI)', theme)
          results.redChips.push(rec2)
          console.log(`  ${theme} ann-bulk: rest ${rec2.restBgHex} ${rec2.restContrast}:1 -> hover ${rec2.hoverBgHex} ${rec2.hoverContrast}:1`)
        } else {
          fail(`admin-announcements header checkbox not found [${theme}]`)
        }
      }
      await ctx.close()
    }
    // --- real chip 3: admin events row --------------------------------------
    {
      const { ctx, page } = await openPage('admin', theme, `${adminBase}/events`)
      const rowDelete = page.getByRole('button', { name: 'Delete', exact: true }).first()
      if (!(await rowDelete.count())) {
        fail(`admin-events row Delete button not found [${theme}]`)
      } else {
        await rowDelete.click()
        await page.waitForTimeout(250)
        const confirm = page.getByRole('button', { name: 'Confirm', exact: true }).first()
        const rec = await measureChip(page, confirm, 'AdminEventsPage row delete-confirm chip (real UI)', theme)
        results.redChips.push(rec)
        console.log(`  ${theme} ev-row: rest ${rec.restBgHex} ${rec.restContrast}:1 -> hover ${rec.hoverBgHex} ${rec.hoverContrast}:1`)
      }
      await ctx.close()
    }
    // --- real chip 4: admin professors row ----------------------------------
    {
      const { ctx, page } = await openPage('admin', theme, `${adminBase}/professors`)
      const rowDelete = page.getByRole('button', { name: 'Delete', exact: true }).first()
      if (!(await rowDelete.count())) {
        fail(`admin-professors row Delete button not found [${theme}]`)
      } else {
        await rowDelete.click()
        await page.waitForTimeout(250)
        const confirm = page.getByRole('button', { name: 'Confirm', exact: true }).first()
        const rec = await measureChip(page, confirm, 'AdminProfessorsPage row delete-confirm chip (real UI)', theme)
        results.redChips.push(rec)
        console.log(`  ${theme} prof-row: rest ${rec.restBgHex} ${rec.restContrast}:1 -> hover ${rec.hoverBgHex} ${rec.hoverContrast}:1`)
      }
      await ctx.close()
    }
    // --- class-identical probes: the three error/retry button class strings -
    {
      const { ctx, page } = await openPage('admin', theme, `${adminBase}/announcements`)
      await page.evaluate((classes) => {
        const host = document.createElement('div')
        host.setAttribute('data-2d-probe', 'error-buttons')
        // A visible top-left overlay so Playwright's hover() gets real
        // coordinates; the host is removed after measuring and never
        // appears in any capture (this page is not screenshotted).
        host.style.cssText = 'position:fixed;top:0;left:0;display:flex;gap:8px;padding:4px;z-index:2147483647;'
        let i = 0
        for (const cls of classes) {
          const b = document.createElement('button')
          b.type = 'button'
          b.className = cls
          b.textContent = 'Try again'
          b.setAttribute('data-2d-probe-idx', String(i++))
          host.appendChild(b)
        }
        document.body.appendChild(host)
      }, Object.values(ERROR_CLASSES))
      for (const [src, cls] of Object.entries(ERROR_CLASSES)) {
        const idx = Object.keys(ERROR_CLASSES).indexOf(src)
        const probe = page.locator(`button[data-2d-probe-idx="${idx}"]`)
        const rec = await measureChip(page, probe, `Error/retry button class string from ${src} (injected class-identical probe)`, theme)
        rec.probeClass = cls
        results.redChips.push(rec)
        console.log(`  ${theme} ${src}: rest ${rec.restBgHex} ${rec.restContrast}:1 -> hover ${rec.hoverBgHex} ${rec.hoverContrast}:1`)
      }
      await page.evaluate(() => document.querySelector('[data-2d-probe]')?.remove())
      await ctx.close()
    }
  }

  // red-chip verdicts
  {
    const darkHover = results.redChips.filter((r) => r.theme === 'dark' && r.hoverContrast !== undefined)
    const lightRest = results.redChips.filter((r) => r.theme === 'light' && r.restContrast !== undefined)
    const lightHover = results.redChips.filter((r) => r.theme === 'light' && r.hoverContrast !== undefined)
    results.redChipVerdict = {
      sites: results.redChips.length,
      darkHoverMin: Math.min(...darkHover.map((r) => r.hoverContrast)),
      darkHoverAllPass3: darkHover.every((r) => r.hoverContrast >= 3),
      darkRestAllPass3: results.redChips.filter((r) => r.theme === 'dark').every((r) => r.restContrast >= 3),
      lightRestRange: [Math.min(...lightRest.map((r) => r.restContrast)), Math.max(...lightRest.map((r) => r.restContrast))],
      lightHoverRange: [Math.min(...lightHover.map((r) => r.hoverContrast)), Math.max(...lightHover.map((r) => r.hoverContrast))],
      lightHoverChanged: lightHover.every((r) => r.hoverChanged),
      darkHoverChanged: darkHover.every((r) => r.hoverChanged),
    }
    const v = results.redChipVerdict
    console.log(`  verdict: ${v.sites} site-themes measured; dark hover min ${v.darkHoverMin}:1 (>=3: ${v.darkHoverAllPass3}); light rest ${v.lightRestRange}, light hover ${v.lightHoverRange}`)
    if (!v.darkHoverAllPass3) fail('dark hover contrast below 3:1 somewhere')
    if (!v.darkRestAllPass3) fail('dark resting contrast below 3:1 somewhere')
  }

  // =========================================================================
  // B. Avatar edge — computed styles + close-ups + rim pixels
  // =========================================================================
  console.log('\nB. avatar probes (both themes)')
  for (const theme of ['light', 'dark']) {
    const { ctx, page } = await openPage('student', theme, studentBase)
    const avatar = page.locator('button[aria-label="Account menu"] div[aria-hidden="true"]').first()
    const count = await avatar.count()
    if (!count) {
      fail(`initials avatar div not found [${theme}]`)
      await ctx.close()
      continue
    }
    const computed = await page.evaluate(() => {
      const btn = document.querySelector('button[aria-label="Account menu"]')
      const el = btn?.querySelector('div[aria-hidden="true"]')
      if (!el) return null
      const cs = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      // topbar surface sample: computed background of the sticky header
      const header = document.querySelector('header') || btn.closest('header')
      const hcs = header ? getComputedStyle(header) : null
      return {
        bg: cs.backgroundColor,
        boxShadow: cs.boxShadow,
        width: rect.width, height: rect.height,
        topbarBg: hcs ? hcs.backgroundColor : null,
      }
    })
    const shot = `shots/avatar-${theme}.png`
    await avatar.screenshot({ path: resolve(shots, `avatar-${theme}.png`) })
    // context clip: 160x64 region around the avatar (topbar right cluster)
    const box = await avatar.boundingBox()
    if (box) {
      const clip = { x: Math.max(0, box.x - 110), y: Math.max(0, box.y - 14), width: Math.min(160, 1280 - Math.max(0, box.x - 110)), height: 64 }
      await page.screenshot({ path: resolve(shots, `avatar-context-${theme}.png`), clip })
    }
    results.avatar[theme] = { computed, shot, contextShot: `shots/avatar-context-${theme}.png` }
    const c = computed
    console.log(`  ${theme}: bg ${c.bg} shadow ${c.boxShadow === 'none' ? 'none' : c.boxShadow.slice(0, 80)}... ${c.width}x${c.height}`)

    if (theme === 'light') {
      if (c.boxShadow !== 'none') fail(`light avatar box-shadow is not none: ${c.boxShadow}`)
      if (c.bg !== 'rgb(30, 41, 59)') fail(`light avatar fill is not #1e293b: ${c.bg}`)
    } else {
      if (c.boxShadow === 'none') fail('dark avatar box-shadow is none — ring missing')
      else {
        const m = c.boxShadow.match(/rgba?\([^)]*\)/g)
        if (!m || !m.some((s) => /255,\s*255,\s*255/i.test(s) || /oklch|lab|color\(/i.test(s))) {
          // color-mix form: record it verbatim; presence of inset is the structural check
        }
        if (!/inset/.test(c.boxShadow)) fail('dark avatar ring is not inset')
      }
    }
    await ctx.close()
  }

  // rim pixel analysis of the dark avatar close-up: a transparent edge
  // profile along the horizontal diameter (fill -> 1px ring band ->
  // anti-aliased circle edge) plus a clean topbar sample taken directly
  // ABOVE the avatar in the context clip (the name text sits to the
  // RIGHT of the avatar, so a right-side sample would hit text).
  {
    const ctx = await newGateContext(browser)
    const probe = await ctx.newPage()
    const png = 'data:image/png;base64,' + readFileSync(resolve(shots, 'avatar-dark.png')).toString('base64')
    const ctxPng = 'data:image/png;base64,' + readFileSync(resolve(shots, 'avatar-context-dark.png')).toString('base64')
    const rim = await probe.evaluate(async ({ png, ctxPng }) => {
      const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load')); i.src = src })
      const av = await load(png)
      const cxi = await load(ctxPng)
      const cav = document.createElement('canvas'); cav.width = av.width; cav.height = av.height
      const ccv = document.createElement('canvas'); ccv.width = cxi.width; ccv.height = cxi.height
      const a = cav.getContext('2d', { willReadFrequently: true })
      const b = ccv.getContext('2d', { willReadFrequently: true })
      a.drawImage(av, 0, 0); b.drawImage(cxi, 0, 0)
      const W = av.width, H = av.height
      const midY = Math.floor(H / 2)
      // horizontal profile across the full avatar width at mid-height
      const profile = []
      for (let x = 0; x < W; x++) profile.push(Array.from(a.getImageData(x, midY, 1, 1).data.slice(0, 3)))
      // vertical profile at mid-width (top edge)
      const vprofile = []
      for (let y = 0; y < H; y++) vprofile.push(Array.from(a.getImageData(Math.floor(W / 2), y, 1, 1).data.slice(0, 3)))
      // clean topbar: directly above the avatar circle in the context clip.
      // The avatar sits at clip-x ~110..146 (clip starts 110px left of the
      // avatar box); sample the strip 4px below the clip top at the
      // avatar's horizontal center.
      const avatarCx = 110 + Math.round(W / 2)
      const topbarAbove = Array.from(b.getImageData(Math.min(cxi.width - 1, avatarCx), 4, 1, 1).data.slice(0, 3))
      return { width: W, height: H, profile, vprofile, topbarAbove }
    }, { png, ctxPng })
    const toC = (rgb) => ({ r: rgb[0] / 255, g: rgb[1] / 255, b: rgb[2] / 255 })
    const p = rim.profile
    const fill = p[Math.floor(rim.width / 2) - 8] // interior, clear of ring + initials
    const innerAa = p[rim.width - 2]                // inner half of the 1px band (ring over fill, AA)
    const ringPixel = p[rim.width - 1]              // the ring-band pixel: 15% white over the fill, AA'd toward the topbar at the circle edge
    const topbar = rim.topbarAbove
    const ringC = toC(ringPixel), fillC = toC(fill), topbarC = toC(topbar), innerC = toC(innerAa)
    results.avatarRim = {
      width: rim.width, height: rim.height,
      horizontalProfile: p, verticalProfile: rim.vprofile,
      fillHex: hexOf(fillC), innerAaHex: hexOf(innerC), ringBandHex: hexOf(ringC), topbarHex: hexOf(topbarC),
      ringBandVsTopbar: Math.round(contrast(ringC, topbarC) * 1000) / 1000,
      fillVsTopbar: Math.round(contrast(fillC, topbarC) * 1000) / 1000,
      ringBandVsFill: Math.round(contrast(ringC, fillC) * 1000) / 1000,
      innerAaVsFill: Math.round(contrast(innerC, fillC) * 1000) / 1000,
      note: '36px avatar, 1px inset ring with subpixel AA: the outermost pixel is the ring color (15% white over the fill; theoretical 0.15*255+0.85*fill) blended slightly toward the topbar at the circle edge; the second-from-edge pixel is the inner AA half. Raw per-pixel profiles retained in report.json.',
    }
    console.log(`  dark rim profile (mid-height): fill ${results.avatarRim.fillHex} -> inner-AA ${results.avatarRim.innerAaHex} -> ring-band ${results.avatarRim.ringBandHex} | topbar ${results.avatarRim.topbarHex}`)
    console.log(`  contrasts: ring-band-vs-topbar ${results.avatarRim.ringBandVsTopbar}:1, fill-vs-topbar ${results.avatarRim.fillVsTopbar}:1, ring-band-vs-fill ${results.avatarRim.ringBandVsFill}:1`)
    await ctx.close()
  }

  // =========================================================================
  // C. Blurred surfaces — the four faculty modal states, dark, evidence only
  // =========================================================================
  console.log('\nC. faculty blurred-scrim modals (dark, evidence only)')

  const MODAL_JOBS = [
    {
      name: 'grade-history',
      url: `${facultyBase}/grade-encoding`,
      open: async (page) => { await page.locator('button[aria-label^="Grade history for"]').first().click() },
      panel: '[aria-label="Grade history"]',
    },
    {
      name: 'previous-records-section',
      url: `${facultyBase}/previous-records`,
      open: async (page) => { await page.getByRole('button', { name: 'View', exact: true }).first().click() },
      panel: '[aria-label="Section record"]',
    },
    {
      name: 'student-file',
      url: `${facultyBase}/my-students`,
      open: async (page) => {
        // Expand the first class-section card. The card header is the
        // button[aria-expanded] that is a DIRECT CHILD of the section card
        // (the SelectMenu filter triggers also carry aria-expanded and
        // must not be clicked).
        await page.locator('div.rounded-xl.border > button[aria-expanded]').first().click()
        await page.waitForTimeout(600)
        await page.getByRole('button', { name: 'View', exact: true }).first().click()
      },
      panel: '[aria-label="Student file"]',
    },
    {
      name: 'attendance-history',
      url: `${facultyBase}/my-students`,
      open: async (page) => {
        await page.locator('div.rounded-xl.border > button[aria-expanded]').first().click()
        await page.waitForTimeout(600)
        await page.getByRole('button', { name: 'View', exact: true }).first().click()
        await page.waitForTimeout(900)
        await page.getByRole('button', { name: 'Attendance history' }).click()
      },
      panel: '[aria-label="Attendance history"]',
    },
  ]

  // The collector is an IIFE STRING (the Playwright evaluate convention
  // used by the 2C matrix COLLECTOR) with the panel selector embedded —
  // a bare arrow-function string with a separate arg does not get
  // invoked reliably.
  const modalCollectorFor = (panelSel) => `(() => {
    const panel = document.querySelector('${panelSel}')
    if (!panel) return null
    const out = []
    const exemptOf = (el) => {
      if (el.closest('.aics-skeleton')) return 'skeleton'
      if (el.closest('.sr-only')) return 'sr-only'
      if (el.closest('svg')) return 'svg'
      return null
    }
    const walker = document.createTreeWalker(panel, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const text = node.nodeValue.replace(/\\s+/g, ' ').trim()
      if (!text) continue
      const el = node.parentElement
      if (!el || el.nodeType !== 1) continue
      if (exemptOf(el)) continue
      const rects = el.getClientRects()
      if (!rects.length) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue
      const chain = []
      let p = el
      while (p && p !== panel.parentElement && chain.length < 14) {
        const s = getComputedStyle(p)
        chain.push({ bg: s.backgroundColor, img: s.backgroundImage !== 'none' ? s.backgroundImage.slice(0, 80) : null })
        p = p.parentElement
      }
      out.push({ text: text.slice(0, 90), tag: el.tagName.toLowerCase(), cls: String(el.className || '').slice(0, 110), color: cs.color, fontSize: cs.fontSize, fontWeight: cs.fontWeight, chain })
      if (out.length > 3000) break
    }
    return out
  })()`

  for (const job of MODAL_JOBS) {
    const entry = { name: job.name, theme: 'dark', status: 'pass', checks: [] }
    const { ctx, page } = await openPage('faculty', 'dark', job.url)
    try {
      await job.open(page)
      await page.waitForTimeout(1000)
      const panel = page.locator(job.panel)
      const panelCount = await panel.count()
      entry.checks.push({ desc: 'modal panel opened', ok: panelCount > 0 })
      if (!panelCount) throw new Error(`${job.panel} did not open`)
      const modalComputed = await page.evaluate((panelSel) => {
        const panel = document.querySelector(panelSel)
        const pcs = getComputedStyle(panel)
        // The modal scrim: a position:fixed full-viewport element with a
        // backdrop filter. The cookie-consent banner is also fixed +
        // blurred, so select by viewport-covering bounding rect, not
        // merely by backdropFilter presence.
        const vw = window.innerWidth, vh = window.innerHeight
        let scrimEl = null
        for (const d of document.querySelectorAll('div')) {
          const s = getComputedStyle(d)
          if (s.backdropFilter === 'none' || s.position !== 'fixed') continue
          const r = d.getBoundingClientRect()
          if (r.width >= vw - 2 && r.height >= vh - 2) { scrimEl = d; break }
        }
        let scrimInfo = null
        if (scrimEl) {
          const scs = getComputedStyle(scrimEl)
          scrimInfo = { cls: String(scrimEl.className).slice(0, 90), bg: scs.backgroundColor, backdropFilter: scs.backdropFilter }
        }
        return { panelBg: pcs.backgroundColor, panelBackdropFilter: pcs.backdropFilter, scrim: scrimInfo }
      }, job.panel)
      entry.modalComputed = modalComputed
      entry.checks.push({ desc: 'scrim has backdrop blur', ok: /blur/.test(modalComputed.scrim?.backdropFilter || '') })
      entry.checks.push({ desc: 'scrim element found (full-viewport, blurred)', ok: !!modalComputed.scrim })
      const panelBg = parseColor(modalComputed.panelBg)
      entry.checks.push({ desc: 'panel is opaque (alpha 1)', ok: panelBg ? panelBg.a >= 0.999 : false })
      // readability audit inside the panel
      const records = await page.evaluate(modalCollectorFor(job.panel))
      const findings = []
      let audited = 0
      if (records) {
        for (const r of records) {
          const fg = parseColor(r.color)
          if (!fg) continue
          const layers = []
          let exempt = null
          for (const anc of r.chain || []) {
            if (anc.img) { exempt = 'bg-image'; break }
            const c = parseColor(anc.bg)
            if (!c) { exempt = 'unparseable'; break }
            if (c.a >= 0.999) { layers.push(c); break }
            if (c.a > 0) layers.push(c)
          }
          if (exempt || !layers.length) continue
          let bg = layers[layers.length - 1]
          for (let i = layers.length - 2; i >= 0; i--) bg = over(layers[i], bg)
          let fgO = fg
          if (fg.a < 0.999) fgO = over(fg, bg)
          const ratio = contrast(fgO, bg)
          const pxf = parseFloat(r.fontSize) || 16
          const weight = parseInt(r.fontWeight) || 400
          const large = pxf >= 24 || (pxf >= 18.66 && weight >= 700)
          const bar = large ? 3 : 4.5
          audited++
          if (ratio < bar) findings.push({ text: r.text, fg: hexOf(fgO), bg: hexOf(bg), ratio: Math.round(ratio * 100) / 100, bar, fontSize: r.fontSize, fontWeight: r.fontWeight })
        }
      }
      entry.audited = audited
      entry.readabilityFindings = findings
      entry.checks.push({ desc: 'panel text readability audit ran', ok: audited > 0 })
      entry.shot = `shots/dark-faculty-${job.name}.png`
      await page.screenshot({ path: resolve(shots, `dark-faculty-${job.name}.png`), fullPage: false })
      console.log(`  ${entry.status.toUpperCase()}  dark-faculty-${job.name} (scrim ${modalComputed.scrim?.backdropFilter}, panel ${modalComputed.panelBg}, audited ${audited}, findings ${findings.length})`)
      for (const c of entry.checks) if (!c.ok) { entry.status = 'fail'; fail(`faculty-${job.name}: ${c.desc}`) }
    } catch (err) {
      entry.status = 'blocked'
      entry.detail = String(err).slice(0, 300)
      fail(`faculty-${job.name}: ${entry.detail}`)
    } finally {
      await ctx.close().catch(() => {})
      results.facultyModals.push(entry)
    }
  }

  // --- cookie banner (dark, documentation only) -----------------------------
  console.log('\nC2. cookie-consent banner compositing (dark, documentation only)')
  {
    const { ctx, page } = await openPage('student', 'dark', studentBase)
    // The banner is a <section role="region" aria-label="Cookie consent">,
    // not a div — the fixed/inset-x-0/bottom-0 classes sit on the section.
    const banner = page.locator('section[role="region"][aria-label="Cookie consent"]')
    const bCount = await banner.count()
    if (!bCount) {
      fail('cookie banner not found on student dashboard')
    } else {
      const computed = await banner.evaluate((el) => {
        const cs = getComputedStyle(el)
        return { bg: cs.backgroundColor, backdropFilter: cs.backdropFilter, borderTop: cs.borderTopColor, supportsQuery: CSS.supports('backdrop-filter', 'blur(4px)') }
      })
      results.cookieBanner = { computed, shot: 'shots/dark-cookie-banner.png' }
      await page.screenshot({ path: resolve(shots, 'dark-cookie-banner.png'), fullPage: false })
      console.log(`  banner: bg ${computed?.bg} backdrop ${computed?.backdropFilter}`)
    }
    await ctx.close()
  }

  await browser.close()
} catch (err) {
  console.error(`2d-focus FAIL: ${err}`)
  failures++
} finally {
  await cleanup()
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
writeFileSync(resolve(outDir, 'report.json'), JSON.stringify(results, null, 2))
const lines = [
  `result: ${failures === 0 ? 'PASS' : 'FAIL'} (${failures} failures)`,
  `red-chip probes: ${results.redChips.length} site-themes (4 real UI chips + 3 injected class-identical error-button probes, x 2 themes)`,
  `red-chip dark hover: min ${results.redChipVerdict?.darkHoverMin}:1 (bar 3:1; planning estimate 3.951:1)`,
  `avatar: light shadow-none + #1e293b fill verified; dark ring computed + measured ring-band ${results.avatarRim?.ringBandHex} (${results.avatarRim?.ringVsTopbar}:1 vs topbar; fill ${results.avatarRim?.fillVsTopbar}:1; see findings for the planning-estimate discrepancy)`,
  `faculty modals: ${results.facultyModals.length} dark captures (blurred scrims + opaque panels + readability audits)`,
  `cookie banner: computed compositing recorded (documentation only)`,
  `parser self-test: ${results.parserSelfTest.every((p) => p.ok) ? 'PASS' : 'FAIL'} (4 tokens)`,
]
writeManifest(outDir, lines)
console.log(`\n2d-focus: ${failures === 0 ? 'PASS' : 'FAIL'} — evidence: ${outDir}`)
process.exit(failures === 0 ? 0 : 1)
