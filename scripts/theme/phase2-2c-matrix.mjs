#!/usr/bin/env node
// Stage 2C — full route matrix x role x theme validation (Phase 2).
//
// Command:
//   bun scripts/theme/phase2-2c-matrix.mjs --mode survey --out docs/done/qa_evidence/ui-ux/dark-theme/phase2/2c/matrix-survey/
//   bun scripts/theme/phase2-2c-matrix.mjs --mode gate --out docs/done/qa_evidence/ui-ux/dark-theme/phase2/2c/matrix/
//
// Validates the dark-theme implementation across the FULL supported route
// matrix (the nav-config inventory: every primary + secondary view per
// role, plus login, the four /legal routes, and the 404 page), in BOTH
// resolved themes, plus the three Stage-2C focus areas:
//
//   1. Route matrix: every capture asserts the rendered page (not a login
//      redirect), the resolved theme state (html.dark + canvas token), zero
//      console/page errors, and passes a DOM text-contrast audit (computed
//      color vs effective background, WCAG 2.1 bars: 4.5:1 body, 3:1 large
//      text). Light-mode sub-bar pairs are recorded as INFO (light output
//      is pixel-frozen by G4; a light anomaly is pre-existing, not a
//      dark-theme regression). Dark sub-bar pairs are findings: FAIL in
//      gate mode unless covered by a documented exemption.
//   2. COE print views (both themes): the on-screen modal preview is
//      audited, then @media print is emulated (layout assertions: only
//      .coe-print-area visible, absolute at 0,0; the document text color
//      stays the literal navy in BOTH themes) and a real print output is
//      generated via page.pdf() and pixel-verified (white paper, navy
//      text) after rasterizing with pdftoppm.
//   3. ID cards (both themes): the card's overlay text computed colors
//      must equal the id-card-config literals exactly (theme-independent
//      by construction); the card element screenshot must be pixel-
//      identical between themes; the "View Digital ID" dialog is audited.
//
// Modes:
//   survey — collect and report everything; contrast findings do not fail
//     the run (used to triage at the Stage-2B checkpoint before fixing).
//   gate — same checks, but non-exempted dark contrast findings FAIL the
//     run (used after the Stage-2C fixes; the exemption list is explicit
//     and documented below).
//
// Structural exemptions (never counted as findings, with reasons):
//   - text inside [role="img"] — the ID card renders overlay text on a
//     PNG template; the DOM background walk cannot see the image.
//   - .aics-skeleton and any element over a background-image (gradients)
//     — no single computable background color.
//   - svg text, .sr-only.
//
// Documented dual-use exemption (gate mode; mirrors the globals.css
// comment and phase1-contrast.mjs): white bold text on the dark red-600
// solid chip keeps the 3:1 bar (3.38:1 measured) — solid status chips
// are treated as non-text/large per the recorded ruling.
//
// Environment preconditions (reported, never silently assumed):
//   - built .next (bun run build), MongoDB reachable + seeded demo
//     dataset, Playwright Chromium, pdftoppm/pdfinfo (poppler) for the
//     print rasterization. Isolated server on port 4304.

import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { SignJWT } from 'jose'
import { chromium } from 'playwright'
import { WT, headSha, launchBrowser, newGateContext, pixelDiff, writeManifest, invocationLine, resolve } from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase2/2c/matrix'))
const mode = argOf('--mode', 'survey')
if (!['survey', 'gate'].includes(mode)) {
  console.error(`2c-matrix FAIL: unknown --mode ${mode} (survey | gate)`)
  process.exit(2)
}
// Phased execution (the gate sandbox reaps detached processes, so long runs
// execute as foreground slices): routes:a-b | interactions | coe | id |
// report | all. Each phase appends entries to results.jsonl in outDir; the
// report phase assembles route-matrix.json + findings-summary.txt + the
// manifest from the accumulated lines (deduped by kind+name+theme, last
// wins — re-running a phase replaces its entries).
const phaseArg = argOf('--phase', 'all')
const phaseMatch = phaseArg.match(/^routes:(\d+)-(\d+)$/)
if (!phaseMatch && !['interactions', 'coe', 'id', 'report', 'all'].includes(phaseArg)) {
  console.error(`2c-matrix FAIL: unknown --phase ${phaseArg} (routes:a-b | interactions | coe | id | report | all)`)
  process.exit(2)
}

const PORT = 4304
const ORIGIN = `http://127.0.0.1:${PORT}`
const DEV_SECRET = 'dev-only-insecure-secret-change-in-production'
const SESSION_COOKIE = 'aics_session'
const BRANCH = 'commonwealth'
const STUDENT = 'juan.santos'
const FACULTY = 'm.reyes'
const ADMIN = 'admin'

// ---------------------------------------------------------------------------
// Color math (CSS Color 4). Chromium reserializes computed oklch colors as
// lab(); the parser therefore handles rgb/rgba/hex/oklch/oklab/lab/color()
// and everything is normalized to linear sRGB then relative luminance.
// The oklch path is the same math phase1-contrast.mjs validated against
// the v4 palette; the lab path is validated at runtime by the self-test
// (browser-lab(parse) vs oklch(parse) of the same token).
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

// CIE Lab (D50) -> linear sRGB per CSS Color 4 sample code.
function labToLinear(L, a, b) {
  const d50 = [0.3457 / 0.3585, 1.0, 0.2958 / 0.3585]
  const ke = 24389 / 27 // kappa = 903.296...
  const eps = 216 / 24389 // 0.008856...
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const fx3 = fx ** 3
  const fz3 = fz ** 3
  const xr = fx3 > eps ? fx3 : (116 * fx - 16) / ke
  // Lab L is 0-100; the branch threshold is kappa*eps = 8 (NOT kappa —
  // an earlier draft compared L > 903, which is never true and silently
  // destroyed every light color; caught by the strengthened self-test).
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

/** Parse a CSS color string to {r,g,b,a} in gamma-encoded sRGB 0..1. */
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

/** Composite fg over bg honoring alpha. */
function over(fg, bg) {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: fg.a + bg.a * (1 - fg.a),
  }
}

// ---------------------------------------------------------------------------
// Route matrix — the nav-config inventory (primary + secondary views per
// role), login, the four /legal routes, and the 404 page. Never silently
// reduced; an unreachable route is recorded as blocked, not passed.
// ---------------------------------------------------------------------------

const studentBase = `/portal/${BRANCH}/student/${STUDENT}`
const facultyBase = `/portal/${BRANCH}/faculty/${FACULTY}`
const adminBase = `/portal/${BRANCH}/admin/${ADMIN}`

const ROUTES = [
  // public
  { name: 'login', url: '/portal/login', role: null },
  { name: 'legal-privacy', url: '/legal/privacy', role: null },
  { name: 'legal-terms', url: '/legal/terms', role: null },
  { name: 'legal-cookies', url: '/legal/cookies', role: null },
  { name: 'legal-refund', url: '/legal/refund', role: null },
  { name: 'not-found', url: '/this-route-does-not-exist', role: null },
  // student portal (STUDENT_PRIMARY_NAV + SECONDARY_NAV + profile; /tasks
  // is not in the student nav but is a parseable URL that falls through to
  // the student dashboard — captured so its behavior is documented)
  { name: 'student-dashboard', url: studentBase, role: 'student' },
  { name: 'student-profile', url: `${studentBase}/profile`, role: 'student' },
  { name: 'student-academics', url: `${studentBase}/academics`, role: 'student' },
  { name: 'student-events', url: `${studentBase}/events`, role: 'student' },
  { name: 'student-professors', url: `${studentBase}/professors`, role: 'student' },
  { name: 'student-enrollment', url: `${studentBase}/enrollment`, role: 'student' },
  { name: 'student-tasks', url: `${studentBase}/tasks`, role: 'student' },
  { name: 'student-settings', url: `${studentBase}/settings`, role: 'student' },
  { name: 'student-help', url: `${studentBase}/help`, role: 'student' },
  // faculty portal (FACULTY_PRIMARY_NAV + SECONDARY_NAV)
  { name: 'faculty-dashboard', url: facultyBase, role: 'faculty' },
  { name: 'faculty-my-students', url: `${facultyBase}/my-students`, role: 'faculty' },
  { name: 'faculty-grade-encoding', url: `${facultyBase}/grade-encoding`, role: 'faculty' },
  { name: 'faculty-previous-records', url: `${facultyBase}/previous-records`, role: 'faculty' },
  { name: 'faculty-announcements', url: `${facultyBase}/announcements`, role: 'faculty' },
  { name: 'faculty-schedule', url: `${facultyBase}/schedule`, role: 'faculty' },
  { name: 'faculty-tasks', url: `${facultyBase}/tasks`, role: 'faculty' },
  { name: 'faculty-settings', url: `${facultyBase}/settings`, role: 'faculty' },
  { name: 'faculty-help', url: `${facultyBase}/help`, role: 'faculty' },
  // admin portal (ADMIN_PRIMARY_NAV + SECONDARY_NAV)
  { name: 'admin-dashboard', url: adminBase, role: 'admin' },
  { name: 'admin-release-queue', url: `${adminBase}/release-queue`, role: 'admin' },
  { name: 'admin-events', url: `${adminBase}/events`, role: 'admin' },
  { name: 'admin-announcements', url: `${adminBase}/announcements`, role: 'admin' },
  { name: 'admin-professors', url: `${adminBase}/professors`, role: 'admin' },
  { name: 'admin-people', url: `${adminBase}/people`, role: 'admin' },
  { name: 'admin-enrollment', url: `${adminBase}/enrollment`, role: 'admin' },
  { name: 'admin-settings', url: `${adminBase}/settings`, role: 'admin' },
  { name: 'admin-help', url: `${adminBase}/help`, role: 'admin' },
]

// ---------------------------------------------------------------------------
// In-page collector: one record per visible text node with its computed
// color, font size/weight, and the ancestor background chain (colors +
// background-image flags) up to <html>. Conversion and classification run
// in Node (the parser above), so the page only collects strings.
// ---------------------------------------------------------------------------

const COLLECTOR = `(() => {
  const out = []
  const exemptOf = (el) => {
    if (el.closest('[role="img"]')) return 'id-card-overlay'
    if (el.closest('.aics-skeleton')) return 'skeleton'
    if (el.closest('.sr-only')) return 'sr-only'
    if (el.closest('svg')) return 'svg'
    return null
  }
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let node
  while ((node = walker.nextNode())) {
    const text = node.nodeValue.replace(/\\s+/g, ' ').trim()
    if (!text) continue
    const el = node.parentElement
    if (!el || el.nodeType !== 1) continue
    const reason = exemptOf(el)
    if (reason) continue
    const rects = el.getClientRects()
    if (!rects.length) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue
    const chain = []
    let p = el
    while (p && p !== document.documentElement && chain.length < 14) {
      const s = getComputedStyle(p)
      chain.push({
        tag: p.tagName.toLowerCase(),
        cls: String(p.className && p.className.baseVal !== undefined ? p.className.baseVal : p.className || '').slice(0, 100),
        bg: s.backgroundColor,
        img: s.backgroundImage !== 'none' ? s.backgroundImage.slice(0, 80) : null,
      })
      p = p.parentElement
    }
    out.push({
      text: text.slice(0, 90),
      tag: el.tagName.toLowerCase(),
      cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className || '').slice(0, 110),
      color: cs.color,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      chain,
    })
    if (out.length > 6000) break
  }
  return out
})()`

// ---------------------------------------------------------------------------
// Node-side audit: resolve the effective background for each record, then
// classify. Structural exemptions mirror the collector plus background-
// image detection here (gradients/PNG-backed surfaces have no computable
// single background).
// ---------------------------------------------------------------------------

const RED600_DARK = parseColor('oklch(0.66 0.18 25)') // dual-use chip ruling

function resolveBg(record) {
  const chain = record.chain || []
  const layers = []
  for (const anc of chain) {
    if (anc.img) return { exempt: 'bg-image', detail: anc.img }
    const c = parseColor(anc.bg)
    if (!c) return { exempt: 'unparseable-bg', detail: anc.bg }
    if (c.a >= 0.999) {
      layers.push(c)
      break
    }
    if (c.a > 0) layers.push(c)
  }
  if (!layers.length) return { exempt: 'transparent-canvas' }
  let bg = layers[layers.length - 1]
  for (let i = layers.length - 2; i >= 0; i--) bg = over(layers[i], bg)
  return { color: bg }
}

function isNearWhite(c) {
  return luminance(c) > 0.9
}

function classify(records, theme) {
  const findings = []
  const exempted = []
  let audited = 0
  for (const r of records) {
    const fg = parseColor(r.color)
    if (!fg) {
      exempted.push({ ...r, exempt: 'unparseable-fg', raw: r.color })
      continue
    }
    const bgRes = resolveBg(r)
    if (bgRes.exempt) {
      exempted.push({ ...r, exempt: bgRes.exempt, detail: bgRes.detail })
      continue
    }
    let fgOpaque = fg
    if (fg.a < 0.999) fgOpaque = over(fg, bgRes.color)
    const ratio = contrast(fgOpaque, bgRes.color)
    const px = parseFloat(r.fontSize) || 16
    const weight = parseInt(r.fontWeight) || 400
    const large = px >= 24 || (px >= 18.66 && weight >= 700)
    const bar = large ? 3 : 4.5
    audited++
    if (ratio < bar) {
      // Documented dual-use exemption: white bold text on the dark red-600
      // solid chip keeps the 3:1 bar (globals.css comment + phase1
      // contrast report; 3.38:1 measured).
      const bgIsRed600 =
        Math.abs(luminance(bgRes.color) - luminance(RED600_DARK)) < 0.03 &&
        contrast(bgRes.color, RED600_DARK) < 1.15
      if (theme === 'dark' && bgIsRed600 && isNearWhite(fgOpaque) && weight >= 600 && ratio >= 3) {
        exempted.push({ ...r, exempt: 'dual-use-red-600-chip', ratio: Math.round(ratio * 100) / 100, bg: hexOf(bgRes.color), fg: hexOf(fgOpaque) })
        continue
      }
      findings.push({
        text: r.text,
        tag: r.tag,
        cls: r.cls,
        fg: hexOf(fgOpaque),
        fgRaw: r.color,
        bg: hexOf(bgRes.color),
        bgRaw: (r.chain.find((a) => parseColor(a.bg) && parseColor(a.bg).a > 0.02) || {}).bg || '',
        ratio: Math.round(ratio * 100) / 100,
        bar,
        large,
        fontSize: r.fontSize,
        fontWeight: r.fontWeight,
      })
    }
  }
  return { audited, findings, exempted }
}

// ---------------------------------------------------------------------------
// Runner
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
  throw new Error(`2c-matrix server at ${ORIGIN} did not become ready`)
}

const results = []
let failures = 0
let blocked = 0
const RESULTS_JSONL = resolve(outDir, 'results.jsonl')
function record(entry) {
  results.push(entry)
  if (entry.status === 'fail') failures++
  if (entry.status === 'blocked') blocked++
  if (phaseArg !== 'report') {
    mkdirSync(outDir, { recursive: true })
    writeFileSync(RESULTS_JSONL, JSON.stringify(entry) + '\n', { flag: 'a' })
  }
}

function themeInitScript(theme) {
  return theme === 'dark' ? `localStorage.setItem('aics_theme', 'dark')` : `localStorage.setItem('aics_theme', 'light')`
}

async function captureThemeState(page) {
  return page.evaluate(() => ({
    dark: document.documentElement.classList.contains('dark'),
    bg: getComputedStyle(document.documentElement).getPropertyValue('--background').trim(),
  }))
}

function canvasLightness(bg) {
  const m = String(bg).match(/-?\d+(?:\.\d+)?/)
  return m ? parseFloat(m[0]) : null
}

if (!['report'].includes(phaseArg)) {
  if (!existsSync(resolve(WT, '.next/BUILD_ID'))) {
    console.error('2c-matrix FAIL: .next/BUILD_ID missing — run bun run build first')
    process.exit(2)
  }
  for (const bin of ['pdftoppm', 'pdfinfo']) {
    const ok = execFileSync(`command -v ${bin}`, { shell: true, encoding: 'utf8' }).trim()
    if (!ok) {
      console.error(`2c-matrix FAIL: ${bin} (poppler-utils) is required for the print rasterization`)
      process.exit(2)
    }
  }
}

const runRoutes = phaseMatch || phaseArg === 'all'
const routeSlice = phaseMatch ? ROUTES.slice(parseInt(phaseMatch[1], 10), parseInt(phaseMatch[2], 10) + 1) : ROUTES
const runInteractions = ['interactions', 'all'].includes(phaseArg)
const runCoe = ['coe', 'all'].includes(phaseArg)
const runId = ['id', 'all'].includes(phaseArg)

if (phaseArg === 'report') {
  // Assemble the final report from the accumulated results.jsonl (no
  // server, no browser).
  if (!existsSync(RESULTS_JSONL)) {
    console.error(`2c-matrix FAIL: ${RESULTS_JSONL} missing — run the capture phases first`)
    process.exit(2)
  }
  const acc = new Map()
  for (const line of readFileSync(RESULTS_JSONL, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const e = JSON.parse(line)
    acc.set(`${e.kind}|${e.name}|${e.theme ?? ''}`, e) // last wins (re-runs replace)
  }
  results.push(...acc.values())
  writeReport(results)
  // Recount AFTER writeReport: the gate verdict (dark regressions,
  // light-parity classification) upgrades entry statuses in place.
  failures = results.filter((e) => e.status === 'fail').length
  blocked = results.filter((e) => e.status === 'blocked').length
  console.log(`\n2c-matrix (${mode}) report: ${failures === 0 && blocked === 0 ? 'PASS' : 'FAIL'} — ${results.length} entries, ${failures} failures, ${blocked} blocked`)
  console.log(`evidence: ${outDir}`)
  process.exit(failures === 0 && blocked === 0 ? 0 : 1)
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

try {
  await waitForServer()
  console.log(`2c-matrix (${mode}): server ready on ${ORIGIN}`)
  const browser = await launchBrowser()

  // sessions
  const studentCookie = (
    await (await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST' })).headers.getSetCookie()
  ).join('\n').match(/aics_session=([^;]+)/)[1]
  const facultyToken = await mintSession(FACULTY, 'faculty')
  const adminToken = await mintSession(ADMIN, 'admin')
  const sessionFor = (role) =>
    role === 'student' ? studentCookie : role === 'faculty' ? facultyToken : adminToken

  // --- parser self-test: browser-reserialized lab() vs known oklch -------
  // Chromium reserializes computed colors as CIE Lab (and even custom
  // property values come back resolved); the audit depends on the lab()
  // branch of parseColor. Probe four tokens spanning the value range
  // (dark surface, light ink, mid muted-fg, saturated link — the .dark
  // globals.css values below) and require the lab parse of the browser
  // string to agree with the oklch parse of the literal: per-channel
  // drift <= 4/255 (double-conversion rounding) and contrast agreement
  // < 1.03. A low-L-only probe hides gamut bugs in the yr branch, so the
  // light tokens are the critical half of this test.
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
        const cage = contrast(fromLab, fromOklch)
        ok = drift <= 4 / 255 && cage < 1.03
        detail = `drift=${(drift * 255).toFixed(2)}/255 contrast=${cage.toFixed(3)} ${hexOf(fromLab)} vs ${hexOf(fromOklch)}`
      }
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  parser self-test ${p.prop}: ${p.computed} -> ${detail}`)
      if (!ok) selfTestOk = false
    }
    if (!selfTestOk) {
      console.error('2c-matrix FAIL: color parser self-test disagrees — lab/oklch math must match before auditing')
      await browser.close()
      await cleanup()
      process.exit(2)
    }
    await ctx.close()
  }

  // --- route matrix -------------------------------------------------------
  if (runRoutes)
  for (const job of routeSlice) {
    for (const theme of ['light', 'dark']) {
      const entry = {
        kind: 'route',
        name: job.name,
        url: job.url,
        role: job.role,
        theme,
        status: 'pass',
        consoleErrors: [],
        pageErrors: [],
      }
      const ctx = await newGateContext(browser)
      try {
        await ctx.addInitScript(themeInitScript(theme))
        if (job.role) await ctx.addCookies([{ name: SESSION_COOKIE, value: sessionFor(job.role), url: ORIGIN }])
        const page = await ctx.newPage()
        // Resource-status console lines ("Failed to load resource: ... 401")
        // mirror failed HTTP responses and are recorded informationally via
        // the response listener below: the unauthenticated /api/auth/session
        // 401 on public pages is expected useAuth behavior, and pre-existing
        // 403s exist in both themes. Real console errors (React/hydration/JS)
        // and uncaught page errors fail the capture.
        page.on('console', (msg) => {
          if (msg.type() === 'error' && !/^Failed to load resource/.test(msg.text())) entry.consoleErrors.push(msg.text().slice(0, 300))
        })
        page.on('pageerror', (err) => entry.pageErrors.push(String(err).slice(0, 300)))
        page.on('response', (res) => {
          if (res.status() >= 400) {
            entry.resourceStatus = entry.resourceStatus || []
            entry.resourceStatus.push(`${res.status()} ${new URL(res.url()).pathname.slice(0, 90)}`)
          }
        })
        await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
        try {
          await page.goto(`${ORIGIN}${job.url}`, { waitUntil: 'networkidle', timeout: 45000 })
        } catch (navErr) {
          // One retry on transient ERR_ABORTED (observed once in the first
          // survey run; the same navigation succeeded on immediate retry in
          // the isolation probe). The capture still must render and pass
          // every check below — this is not a coverage reduction.
          if (!/ERR_ABORTED/.test(String(navErr))) throw navErr
          entry.retriedNavigation = true
          await page.goto(`${ORIGIN}${job.url}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
          await page.waitForTimeout(4000)
        }
        await page.waitForTimeout(700)

        const path = new URL(page.url()).pathname
        if (job.role && path === '/portal/login') {
          entry.status = 'blocked'
          entry.detail = 'redirected to login — session invalid for this role'
        }
        const st = await captureThemeState(page)
        entry.htmlDark = st.dark
        entry.canvasToken = st.bg
        const L = canvasLightness(st.bg)
        const themeOk = theme === 'dark' ? st.dark === true && L !== null && L <= 10 : st.dark === false && L !== null && L >= 90
        if (!themeOk) {
          entry.status = 'fail'
          entry.themeCheck = `html.dark=${st.dark} canvas=${st.bg}`
        }

        // rendered-content check (beyond HTTP 200)
        const rendered = await page.evaluate(() => ({
          bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
          hasMain: !!document.querySelector('main, form, [role="main"]'),
          title: document.title,
        }))
        entry.rendered = rendered.hasMain && rendered.bodyText.length > 20
        entry.title = rendered.title
        if (!entry.rendered) {
          entry.status = 'fail'
          entry.renderDetail = rendered
        }
        if (entry.consoleErrors.length || entry.pageErrors.length) {
          entry.status = 'fail'
        }

        // DOM text contrast audit
        const records = await page.evaluate(COLLECTOR)
        const audit = classify(records, theme)
        entry.auditedText = audit.audited
        entry.findings = audit.findings
        entry.exemptedCount = audit.exempted.length
        entry.exemptBreakdown = audit.exempted.reduce((acc, e) => {
          acc[e.exempt] = (acc[e.exempt] || 0) + 1
          return acc
        }, {})
        // Gate-mode verdict on dark findings is deferred to the report
        // phase: light-parity matching (a dark finding whose light
        // counterpart fails at a close ratio is a pre-existing pair in
        // BOTH themes — light output is pixel-frozen by G4, so it is
        // INFO, not a dark-theme regression) needs both themes' data.

        // layout sanity: scroll extents recorded per theme
        entry.scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight)

        entry.shot = `shots/${theme}-${job.name}.png`
        await page.screenshot({ path: resolve(shots, `${theme}-${job.name}.png`), fullPage: true })
        console.log(
          `  ${entry.status === 'pass' ? (entry.findings.length ? 'FIND' : 'PASS') : entry.status.toUpperCase()}  ${theme}-${job.name}` +
            ` (audited ${audit.audited}, findings ${audit.findings.length}${theme === 'light' ? ' [info]' : ''}${entry.consoleErrors.length ? `, consoleErrors ${entry.consoleErrors.length}` : ''})`,
        )
      } catch (err) {
        entry.status = 'blocked'
        entry.detail = String(err).slice(0, 300)
        console.log(`  BLOCKED  ${theme}-${job.name} — ${entry.detail}`)
      } finally {
        await ctx.close().catch(() => {})
        record(entry)
      }
    }
  }

  // --- interactions (both themes) ---------------------------------------
  // COE modal (student profile), ID dialog (student profile), topbar
  // dropdown w/ empty state, admin events modal, skeleton loading with
  // the hardened skeleton-presence predicate (lib.mjs).
  const interactions = runInteractions ? [
    { name: 'interaction-coe-modal', url: `${studentBase}/profile`, role: 'student', click: 'button:has-text("Preview Certificate")', expect: '.coe-print-area' },
    { name: 'interaction-id-dialog', url: `${studentBase}/profile`, role: 'student', click: 'button:has-text("View Digital ID")', expect: '[role="dialog"]' },
    { name: 'interaction-topbar-dropdown', url: studentBase, role: 'student', click: 'button[aria-label="Notifications"]', expect: '[role="menu"]' },
    { name: 'interaction-admin-events-modal', url: `${adminBase}/events`, role: 'admin', click: 'button:has-text("Add event")', expect: '[role="dialog"]' },
  ] : []
  for (const job of interactions) {
    for (const theme of ['light', 'dark']) {
      const entry = { kind: 'interaction', name: job.name, url: job.url, role: job.role, theme, status: 'pass', consoleErrors: [], pageErrors: [] }
      const ctx = await newGateContext(browser)
      try {
        await ctx.addInitScript(themeInitScript(theme))
        await ctx.addCookies([{ name: SESSION_COOKIE, value: sessionFor(job.role), url: ORIGIN }])
        const page = await ctx.newPage()
        page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) entry.consoleErrors.push(m.text().slice(0, 300)) })
        page.on('pageerror', (e) => entry.pageErrors.push(String(e).slice(0, 300)))
        await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
        await page.goto(`${ORIGIN}${job.url}`, { waitUntil: 'networkidle', timeout: 45000 })
        await page.waitForTimeout(700)
        await page.click(job.click)
        await page.waitForTimeout(900)
        const present = await page.locator(job.expect).count()
        entry.interactionOpen = present > 0
        if (!present) {
          entry.status = 'fail'
          entry.detail = `${job.expect} not present after clicking ${job.click}`
        }
        const st = await captureThemeState(page)
        entry.htmlDark = st.dark
        const records = await page.evaluate(COLLECTOR)
        const audit = classify(records, theme)
        entry.auditedText = audit.audited
        entry.findings = audit.findings
        // Gate verdict deferred to the report phase (light-parity match).
        if (entry.consoleErrors.length || entry.pageErrors.length) entry.status = 'fail'
        entry.shot = `shots/${theme}-${job.name}.png`
        await page.screenshot({ path: resolve(shots, `${theme}-${job.name}.png`), fullPage: false })
        console.log(`  ${entry.status === 'pass' ? (audit.findings.length ? 'FIND' : 'PASS') : entry.status.toUpperCase()}  ${theme}-${job.name} (open=${present > 0}, audited ${audit.audited}, findings ${audit.findings.length}${theme === 'light' ? ' [info]' : ''})`)
      } catch (err) {
        entry.status = 'blocked'
        entry.detail = String(err).slice(0, 300)
        console.log(`  BLOCKED  ${theme}-${job.name} — ${entry.detail}`)
      } finally {
        await ctx.close().catch(() => {})
        record(entry)
      }
    }
  }

  // skeleton loading (both themes) with the hardened Stage-2A predicate
  if (runInteractions)
  for (const theme of ['light', 'dark']) {
    const entry = { kind: 'interaction', name: 'interaction-skeleton-loading', url: `${studentBase}/events`, role: 'student', theme, status: 'pass', consoleErrors: [] }
    const ctx = await newGateContext(browser)
    try {
      await ctx.addInitScript(themeInitScript(theme))
      await ctx.addCookies([{ name: SESSION_COOKIE, value: studentCookie, url: ORIGIN }])
      const page = await ctx.newPage()
      page.on('console', (m) => { if (m.type() === 'error') entry.consoleErrors.push(m.text().slice(0, 300)) })
      await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
      await page.route('**/api/**', (route) => {
        if (route.request().url().includes('/api/auth/session')) return route.continue()
        return undefined
      })
      await page.goto(`${ORIGIN}${studentBase}/events`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2500)
      const presence = await page.evaluate(() => {
        const count = document.querySelectorAll('.aics-skeleton').length
        const first = count > 0 ? document.querySelector('.aics-skeleton') : null
        const r = first ? first.getBoundingClientRect() : null
        return { count, firstVisible: !!first && r.height > 0 && r.width > 0 }
      })
      entry.skeleton = presence
      if (!(presence.count > 0 && presence.firstVisible)) {
        entry.status = 'fail'
        entry.detail = `skeleton presence failed: ${JSON.stringify(presence)}`
      }
      const st = await captureThemeState(page)
      entry.htmlDark = st.dark
      entry.shot = `shots/${theme}-interaction-skeleton-loading.png`
      await page.screenshot({ path: resolve(shots, `${theme}-interaction-skeleton-loading.png`), fullPage: false })
      console.log(`  ${entry.status === 'pass' ? 'PASS' : 'FAIL'}  ${theme}-interaction-skeleton-loading (blocks=${presence.count}, firstVisible=${presence.firstVisible})`)
    } catch (err) {
      entry.status = 'blocked'
      entry.detail = String(err).slice(0, 300)
    } finally {
      await ctx.close().catch(() => {})
      record(entry)
    }
  }

  // --- COE print validation (both themes) ---------------------------------
  // The COE document is intentionally light-themed (PALETTE literals). In
  // dark mode: (a) the on-screen preview audit comes from the
  // interaction-coe-modal capture; here we prove the PRINT path: print
  // media emulation (only .coe-print-area visible, absolute at 0,0; text
  // color stays the literal navy in BOTH themes) and a real page.pdf()
  // output rasterized with pdftoppm and pixel-verified (white paper,
  // navy text). printBackground stays false (the app sets no
  // print-color-adjust: exact; backgrounds drop in print by design).
  const coeResults = []
  if (runCoe)
  for (const theme of ['light', 'dark']) {
    const entry = { kind: 'coe-print', name: 'coe-print', theme, status: 'pass', checks: [] }
    const ctx = await newGateContext(browser)
    try {
      await ctx.addInitScript(themeInitScript(theme))
      await ctx.addCookies([{ name: SESSION_COOKIE, value: studentCookie, url: ORIGIN }])
      const page = await ctx.newPage()
      await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
      await page.goto(`${ORIGIN}${studentBase}/profile`, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(700)
      await page.click('button:has-text("Preview Certificate")')
      await page.waitForTimeout(900)
      if (!(await page.locator('.coe-print-area').count())) {
        entry.status = 'fail'
        entry.checks.push({ desc: 'COE modal opens', ok: false })
      } else {
        entry.checks.push({ desc: 'COE modal opens', ok: true })

        // print media emulation
        await page.emulateMedia({ media: 'print' })
        await page.waitForTimeout(300)
        const printState = await page.evaluate(() => {
          const area = document.querySelector('.coe-print-area')
          const cs = area ? getComputedStyle(area) : null
          const title = area ? area.querySelector('p.text-xl') : null
          const sidebar = document.querySelector('aside') || document.querySelector('nav')
          return {
            areaPresent: !!area,
            position: cs ? cs.position : null,
            left: cs ? cs.left : null,
            top: cs ? cs.top : null,
            visibility: cs ? cs.visibility : null,
            titleColor: title ? getComputedStyle(title).color : null,
            outsideHidden: sidebar ? getComputedStyle(sidebar).visibility : 'n/a',
            titleText: title ? title.textContent.trim() : null,
          }
        })
        entry.printLayout = printState
        const layoutOk =
          printState.areaPresent &&
          printState.position === 'absolute' &&
          printState.left === '0px' &&
          printState.top === '0px' &&
          printState.visibility === 'visible' &&
          printState.outsideHidden === 'hidden' &&
          printState.titleColor === 'rgb(21, 51, 87)' // PALETTE.navy, theme-independent
        entry.checks.push({ desc: 'print layout: only .coe-print-area visible, absolute 0,0; title navy literal', ok: layoutOk, detail: printState })
        if (!layoutOk) entry.status = 'fail'
        entry.shot = `shots/${theme}-coe-print-layout.png`
        await page.screenshot({ path: resolve(shots, `${theme}-coe-print-layout.png`), fullPage: false })

        // real print output
        const pdfPath = resolve(outDir, `coe-print-${theme}.pdf`)
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: false })
        const pageCount = parseInt(execFileSync(`pdfinfo ${JSON.stringify(pdfPath)} | grep '^Pages:'`, { shell: true, encoding: 'utf8' }).replace(/\D+/g, ''), 10)
        entry.pdf = { file: `coe-print-${theme}.pdf`, pages: pageCount }
        execFileSync(`pdftoppm -png -r 96 ${JSON.stringify(pdfPath)} ${JSON.stringify(resolve(shots, `${theme}-coe-print-render`))}`, { shell: true })
        const renderPng = resolve(shots, `${theme}-coe-print-render-1.png`)
        // pixel verification via the browser canvas
        const px = await page.evaluate(async (pngPath) => {
          const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load')); i.src = src })
          const img = await load('data:image/png;base64,' + pngPath)
          const c = document.createElement('canvas')
          c.width = img.width
          c.height = img.height
          const x = c.getContext('2d', { willReadFrequently: true })
          x.drawImage(img, 0, 0)
          const d = x.getImageData(0, 0, img.width, img.height).data
          const lum = (i) => (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255
          const corners = [
            [8, 8], [img.width - 9, 8], [8, img.height - 9], [img.width - 9, img.height - 9],
          ].map(([cx, cy]) => Math.round(lum((cy * img.width + cx) * 4) * 100) / 100)
          let dark = 0
          let dr = 0, dg = 0, db = 0
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] < 128) continue
            if (lum(i) < 0.35) { dark++; dr += d[i]; dg += d[i + 1]; db += d[i + 2] }
          }
          return { width: img.width, height: img.height, corners, darkPixels: dark, darkAvg: dark ? [Math.round(dr / dark), Math.round(dg / dark), Math.round(db / dark)] : null }
        }, readFileSync(renderPng).toString('base64'))
        entry.pdfPixels = px
        const cornersWhite = px.corners.every((c) => c >= 0.92)
        const textPresent = px.darkPixels > 500
        const navyDominant = px.darkAvg ? px.darkAvg[2] > px.darkAvg[0] && px.darkAvg[2] >= px.darkAvg[1] : false
        entry.checks.push({ desc: 'PDF pixel check: white paper', ok: cornersWhite, detail: px.corners })
        entry.checks.push({ desc: 'PDF pixel check: text present', ok: textPresent, detail: `${px.darkPixels} dark px` })
        entry.checks.push({ desc: 'PDF pixel check: navy-dominant text', ok: navyDominant, detail: px.darkAvg })
        if (!cornersWhite || !textPresent || !navyDominant) entry.status = 'fail'
        await page.emulateMedia({ media: null })
      }
      console.log(`  ${entry.status === 'pass' ? 'PASS' : 'FAIL'}  coe-print-${theme} (${entry.checks.filter((c) => c.ok).length}/${entry.checks.length} checks)`)
    } catch (err) {
      entry.status = 'blocked'
      entry.detail = String(err).slice(0, 300)
      console.log(`  BLOCKED  coe-print-${theme} — ${entry.detail}`)
    } finally {
      await ctx.close().catch(() => {})
      record(entry)
      coeResults.push(entry)
    }
  }

  // --- ID card light-on-dark behavior (both themes) ------------------------
  // The card renders overlay text on the official template PNG with
  // literal colors (id-card-config ID_COLORS). Verify: (1) every overlay
  // text's computed color equals one of the literals exactly, in both
  // themes; (2) the card element screenshot is pixel-identical between
  // themes; (3) the View Digital ID dialog is audited (the [role="img"]
  // subtree is structurally exempt from the DOM audit — the PNG cannot be
  // walked — so the dialog check covers the surrounding chrome).
  //
  // Shot isolation: the cookie-consent banner is fixed to the viewport
  // bottom and covers the card's lower quarter with a theme-dependent
  // translucent veil, and the card's fractional bounding rect (x.66/y.5)
  // bleeds a 1px page-background sliver into element screenshots. The
  // identity check therefore dismisses the consent banner (pre-seeding
  // the aics_cookie_consent key — banner readability is validated by the
  // route/interaction phases WITH it present) and clips the shot 1px
  // inside the card box. The card itself and the dialog audit run on the
  // unmodified page.
  const idResults = []
  const cardShots = {}
  if (runId)
  for (const theme of ['light', 'dark']) {
    const entry = { kind: 'id-card', name: 'id-card', theme, status: 'pass', checks: [] }
    const ctx = await newGateContext(browser)
    try {
      await ctx.addInitScript(`${themeInitScript(theme)}; localStorage.setItem('aics_cookie_consent', 'essential')`)
      await ctx.addCookies([{ name: SESSION_COOKIE, value: studentCookie, url: ORIGIN }])
      const page = await ctx.newPage()
      await page.clock.setFixedTime(new Date('2026-10-24T09:00:00'))
      await page.goto(`${ORIGIN}${studentBase}/profile`, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(900) // FitText measures + settles
      const card = page.locator('[role="img"][aria-label^="Student ID card"]').first()
      const cardCount = await card.count()
      entry.checks.push({ desc: 'ID card present on profile', ok: cardCount > 0 })
      if (!cardCount) {
        entry.status = 'fail'
      } else {
        const overlays = await page.evaluate(() => {
          const card = document.querySelector('[role="img"][aria-label^="Student ID card"]')
          const out = []
          const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
          let n
          while ((n = walker.nextNode())) {
            const t = n.nodeValue.replace(/\s+/g, ' ').trim()
            if (!t) continue
            out.push({ text: t.slice(0, 40), color: getComputedStyle(n.parentElement).color })
          }
          return out
        })
        entry.overlays = overlays
        const literals = {
          'rgb(255, 255, 255)': 'ID_COLORS.white (name/number/course)',
          'rgb(255, 212, 0)': 'ID_COLORS.yellow (branch)',
          'rgb(31, 41, 55)': 'ID_COLORS.ink (address)',
        }
        const allLiteral = overlays.every((o) => literals[o.color])
        const hasEach = Object.keys(literals).every((c) => overlays.some((o) => o.color === c))
        entry.checks.push({ desc: 'overlay colors are exactly the id-card-config literals', ok: allLiteral && hasEach, detail: overlays.map((o) => `${o.color} ${o.text}`).slice(0, 8) })
        if (!allLiteral || !hasEach) entry.status = 'fail'

        const cardShot = resolve(shots, `${theme}-id-card-element.png`)
        // Clip 1px inside the fractional card box (integer clip, PAGE
        // coordinates from locator.boundingBox()) so the shot contains
        // only template + overlays — no background sliver from the
        // x.66/y.5 rect edges.
        await card.scrollIntoViewIfNeeded()
        await page.waitForTimeout(200)
        const box = await card.boundingBox()
        const clip = {
          x: Math.ceil(box.x) + 1,
          y: Math.ceil(box.y) + 1,
          width: Math.floor(box.width) - 2,
          height: Math.floor(box.height) - 2,
        }
        await page.screenshot({ path: cardShot, clip })
        cardShots[theme] = cardShot
        entry.shot = `shots/${theme}-id-card-element.png`

        // View Digital ID dialog
        await page.click('button:has-text("View Digital ID")')
        await page.waitForTimeout(800)
        const dlg = await page.locator('[role="dialog"]').count()
        entry.checks.push({ desc: 'View Digital ID dialog opens', ok: dlg > 0 })
        if (dlg) {
          const records = await page.evaluate(COLLECTOR)
          const audit = classify(records, theme)
          entry.dialogAudited = audit.audited
          entry.dialogFindings = audit.findings
          // Gate verdict deferred to the report phase (light-parity match).
          entry.dialogShot = `shots/${theme}-id-dialog.png`
          await page.screenshot({ path: resolve(shots, `${theme}-id-dialog.png`), fullPage: false })
        } else {
          entry.status = 'fail'
        }
      }
      console.log(`  ${entry.status === 'pass' ? 'PASS' : 'FAIL'}  id-card-${theme} (${entry.checks.filter((c) => c.ok).length}/${entry.checks.length} checks${entry.dialogFindings ? `, dialog findings ${entry.dialogFindings.length}` : ''})`)
    } catch (err) {
      entry.status = 'blocked'
      entry.detail = String(err).slice(0, 300)
      console.log(`  BLOCKED  id-card-${theme} — ${entry.detail}`)
    } finally {
      await ctx.close().catch(() => {})
      record(entry)
      idResults.push(entry)
    }
  }
  // pixel identity between themes (the card must not re-render per theme).
  // The card's rounded corners and outer edge anti-alias against the PAGE
  // background, which legitimately differs per theme — those edge pixels
  // are expected to differ and are recorded informationally. The card
  // INTERIOR (inset 14px: beyond the rounded-lg radius + AA band) must be
  // pixel-identical between themes.
  if (runId) {
    const entry = { kind: 'id-card', name: 'id-card-pixel-identity', status: 'pass' }
    if (cardShots.light && cardShots.dark) {
      const cmp = await browser.newContext()
      const cmpPage = await cmp.newPage()
      const res = await cmpPage.evaluate(async ([aPath, bPath]) => {
        const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load')); i.src = src })
        const [ia, ib] = [await load('data:image/png;base64,' + aPath), await load('data:image/png;base64,' + bPath)]
        if (ia.width !== ib.width || ia.height !== ib.height) return { sizeMismatch: `${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` }
        const w = ia.width
        const h = ia.height
        const mk = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c }
        const [ca, cb] = [mk(), mk()]
        const xa = ca.getContext('2d', { willReadFrequently: true })
        const xb = cb.getContext('2d', { willReadFrequently: true })
        xa.drawImage(ia, 0, 0)
        xb.drawImage(ib, 0, 0)
        const da = xa.getImageData(0, 0, w, h).data
        const db = xb.getImageData(0, 0, w, h).data
        const inset = 14
        let edge = 0
        let interior = 0
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4
            if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) {
              if (x < inset || y < inset || x >= w - inset || y >= h - inset) edge++
              else interior++
            }
          }
        }
        return { size: `${w}x${h}`, edgeDiff: edge, interiorDiff: interior }
      }, [readFileSync(cardShots.light).toString('base64'), readFileSync(cardShots.dark).toString('base64')])
      await cmp.close()
      if (res.sizeMismatch) {
        entry.status = 'fail'
        entry.detail = `size mismatch: ${res.sizeMismatch}`
      } else {
        entry.size = res.size
        entry.edgeDiffPixels = res.edgeDiff
        entry.interiorDiffPixels = res.interiorDiff
        if (res.interiorDiff !== 0) {
          entry.status = 'fail'
          entry.detail = `${res.interiorDiff} interior pixels differ between themes`
        }
        const d = await pixelDiff(browser, cardShots.light, cardShots.dark)
        if (d.diffPixels !== 0) writeFileSync(resolve(shots, 'id-card-theme-diff.png'), Buffer.from(d.diffDataUrl.split(',')[1], 'base64'))
      }
      console.log(`  ${entry.status === 'pass' ? 'PASS' : 'FAIL'}  id-card pixel identity light vs dark (${res.size || '?'}: interior ${res.interiorDiff ?? '?'} px (must be 0), edge AA ${res.edgeDiff ?? '?'} px (corner blend vs page background, expected))`)
    } else {
      entry.status = 'blocked'
      entry.detail = 'card shots missing'
    }
    record(entry)
  }

  await browser.close()

  if (phaseArg !== 'all') {
    // A capture slice: results are already appended to results.jsonl; the
    // report phase assembles the full deliverable. Exit non-zero if THIS
    // slice had hard failures (console/page errors, theme state, blocked).
    console.log(`\n2c-matrix (${mode}) slice ${phaseArg}: ${failures === 0 && blocked === 0 ? 'PASS' : 'FAIL'} — ${results.length} entries, ${failures} failures, ${blocked} blocked`)
    await cleanup()
    process.exit(failures === 0 && blocked === 0 ? 0 : 1)
  }

  // --- report ('all' single-shot path; phased runs use --phase report) ---
  const acc = new Map()
  for (const line of readFileSync(RESULTS_JSONL, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const e = JSON.parse(line)
    acc.set(`${e.kind}|${e.name}|${e.theme ?? ''}`, e)
  }
  const allResults = [...acc.values()]
  writeReport(allResults)
  let rf = 0, rb = 0
  for (const e of allResults) {
    if (e.status === 'fail') rf++
    if (e.status === 'blocked') rb++
  }
  console.log(`\n2c-matrix (${mode}): ${rf === 0 && rb === 0 ? 'PASS' : 'FAIL'} — ${allResults.length} entries, ${rf} failures, ${rb} blocked`)
  console.log(`evidence: ${outDir}`)
  await cleanup()
  process.exit(rf === 0 && rb === 0 ? 0 : 1)
} catch (err) {
  console.error(`2c-matrix FAIL: ${err}`)
  await cleanup()
  process.exit(1)
}

function writeReport(allResults) {
  // Fold per-entry findings (routes/interactions use .findings; the ID
  // dialog audit lands in .dialogFindings on the id-card entries).
  for (const r of allResults) {
    r.allFindings = [...(r.findings || []), ...(r.dialogFindings || [])]
  }
  // Light-parity classification: a dark finding whose text matches a light
  // finding at a close ratio is the SAME sub-bar pair in BOTH themes — a
  // pre-existing marginal design pair, not a dark-theme regression. Light
  // output is pixel-frozen by G4, so "fixing" it would change frozen light
  // pixels; such pairs are recorded as INFO with their light counterpart.
  // Everything else in dark (in gate mode) fails the gate.
  const lightByText = new Map()
  for (const r of allResults) {
    if (r.theme !== 'light') continue
    for (const f of r.allFindings) {
      if (!lightByText.has(f.text)) lightByText.set(f.text, [])
      lightByText.get(f.text).push({ f, on: r.name })
    }
  }
  for (const r of allResults) {
    if (r.theme !== 'dark') continue
    for (const f of r.allFindings) {
      const cands = lightByText.get(f.text) || []
      const match = cands.find((c) => Math.abs(c.f.ratio - f.ratio) <= 0.25)
      if (match) f.lightParity = { lightRatio: match.f.ratio, lightOn: match.on }
    }
    if (mode === 'gate' && r.allFindings.some((f) => !f.lightParity)) {
      r.status = 'fail'
    }
  }
  const darkFindings = allResults.filter((r) => r.theme === 'dark' && r.allFindings.length)
  const lightFindings = allResults.filter((r) => r.theme === 'light' && r.allFindings.length)
  const passCount = allResults.filter((r) => r.status === 'pass').length
  const failCount = allResults.filter((r) => r.status === 'fail').length
  const blockedCount = allResults.filter((r) => r.status === 'blocked').length
  const darkRegressions = []
  const darkLightParity = []
  for (const r of darkFindings) {
    for (const f of r.allFindings) {
      ;(f.lightParity ? darkLightParity : darkRegressions).push({ ...f, seenOn: `${r.theme}-${r.name}` })
    }
  }
  const report = {
    gate: 'Phase 2 Stage 2C — full route matrix + COE print + ID card validation',
    mode,
    head: headSha(),
    startedAt: new Date().toISOString(),
    server: { origin: ORIGIN, port: PORT },
    browser: 'headless Chromium 1280x800 dsf1 colorScheme light reducedMotion reduce',
    counts: {
      entries: allResults.length,
      pass: passCount,
      fail: failCount,
      blocked: blockedCount,
      darkRegressionFindings: darkRegressions.length,
      darkLightParityFindings: darkLightParity.length,
      lightInfoFindings: lightFindings.reduce((n, r) => n + r.allFindings.length, 0),
    },
    routes: ROUTES.length,
    results: allResults,
  }
  writeFileSync(resolve(outDir, 'route-matrix.json'), JSON.stringify(report, null, 2))

  // findings summary (deduped by fg/bg/ratio signature)
  const sig = (f) => `${f.fg}|${f.bg}|${f.ratio}|${f.cls.slice(0, 60)}`
  const dedupe = (list) => {
    const bySig = new Map()
    for (const f of list) {
      const k = sig(f)
      if (!bySig.has(k)) bySig.set(k, { ...f, seenOn: [f.seenOn] })
      else bySig.get(k).seenOn.push(f.seenOn)
    }
    return [...bySig.values()]
  }
  const darkBySig = dedupe(darkRegressions)
  const parityBySig = dedupe(darkLightParity)
  const lightBySig = dedupe(lightFindings.flatMap((r) => r.allFindings.map((f) => ({ ...f, seenOn: `${r.theme}-${r.name}` }))))
  const summaryLines = [
    `mode: ${mode}`,
    `entries: ${allResults.length} (pass ${passCount}, fail ${failCount}, blocked ${blockedCount})`,
    `route matrix: ${ROUTES.length} routes x 2 themes`,
    `dark REGRESSION findings (light counterpart passes): ${darkBySig.length} unique signatures`,
    `dark light-parity findings (same pair fails in light too; pre-existing, INFO): ${parityBySig.length} unique signatures`,
    `light INFO findings (pre-existing; light frozen by G4): ${lightBySig.length} unique signatures`,
    '',
    'DARK REGRESSIONS (unique) — must be zero in gate mode:',
    ...darkBySig.map((f) =>
      `  [${f.ratio}:1 < ${f.bar}] "${f.text.slice(0, 60)}" <${f.tag} class="${f.cls.slice(0, 70)}"> fg=${f.fg} bg=${f.bg} (${f.bgRaw.slice(0, 40)}) on ${f.seenOn.slice(0, 6).join(', ')}${f.seenOn.length > 6 ? ` +${f.seenOn.length - 6} more` : ''}`,
    ),
    '',
    'DARK light-parity pairs (pre-existing in both themes, INFO):',
    ...parityBySig.map((f) =>
      `  [${f.ratio}:1 dark / ${f.lightParity ? f.lightParity.lightRatio : '?'}:1 light] "${f.text.slice(0, 50)}" fg=${f.fg} bg=${f.bg} on ${f.seenOn.slice(0, 4).join(', ')}`,
    ),
    '',
    'LIGHT FINDINGS (INFO — pre-existing, not dark-theme regressions):',
    ...lightBySig.slice(0, 60).map((f) =>
      `  [${f.ratio}:1 < ${f.bar}] "${f.text.slice(0, 50)}" fg=${f.fg} bg=${f.bg} on ${f.seenOn.slice(0, 4).join(', ')}${f.seenOn.length > 4 ? ` +${f.seenOn.length - 4} more` : ''}`,
    ),
    '',
    'COE print:', ...allResults.filter((r) => r.kind === 'coe-print').map((e) => `  ${e.theme}: ${e.status} — ${e.checks.map((c) => `${c.desc}=${c.ok}`).join('; ')}`),
    'ID card:', ...allResults.filter((r) => r.kind === 'id-card').map((e) => {
      if (e.name === 'id-card-pixel-identity') {
        return `  pixel-identity: ${e.status} — interior ${e.interiorDiffPixels} px (must be 0), edge AA ${e.edgeDiffPixels} px (corner blend vs page background, expected), ${e.size}`
      }
      return `  ${e.theme}: ${e.status} — ${e.checks.map((c) => `${c.desc}=${c.ok}`).join('; ')}`
    }),
  ]
  writeFileSync(resolve(outDir, 'findings-summary.txt'), summaryLines.join('\n') + '\n')

  writeManifest(outDir, [
    `command: ${invocationLine('phase2-2c-matrix.mjs')}`,
    `mode: ${mode} (survey reports findings; gate fails on dark findings that are neither exempt, nor light-parity pre-existing pairs)`,
    `route matrix: ${ROUTES.length} routes (login, 4 legal, 404, student x9, faculty x9, admin x9) x 2 themes + 5 interactions x 2 themes + skeleton x2 + COE print x2 + ID card x2`,
    `result: ${failCount === 0 && blockedCount === 0 ? 'PASS' : `FAIL (${failCount} failures, ${blockedCount} blocked)`} in ${mode} mode`,
    `dark regression findings: ${darkBySig.length} unique; dark light-parity (pre-existing, INFO): ${parityBySig.length}; light INFO: ${lightBySig.length}`,
    `Stage 2C starting checkpoint: 462c413 (Stage 2B evidence bundle); survey run pre-fix at that tree, gate run at the Stage 2C fix commit`,
    'sessions: student via POST /api/auth/demo; faculty/admin via dev-fallback-secret JWT; time frozen 2026-10-24T09:00:00',
    'print: @media print emulated + page.pdf (printBackground false, A4) rasterized with pdftoppm -r 96 and pixel-verified',
    'exemptions: [role=img] overlays, skeleton/gradient backgrounds, svg, sr-only; dual-use red-600 chips at the 3:1 bar (documented ruling)',
  ])
}

