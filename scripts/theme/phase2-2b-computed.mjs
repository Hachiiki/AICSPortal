#!/usr/bin/env node
// Phase 2 Stage 2B — computed/pixel pair check for the inline-hex
// migrations (the Stage-2B analog of G2 for this stage's vocabulary).
//
// Command:
//   GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase2 \
//   bun scripts/theme/phase2-2b-computed.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase2/2b/computed/
//
// Proves, for every Stage-2B replacement (Sidebar disabled state,
// Topbar avatar, AcademicHeader Stat, TasksTab OverviewStat tones):
//   LIGHT: the new utility resolves to the IDENTICAL quantized sRGB as
//     the exact pre-Stage-2B inline hex literal (fill-paint pixel diff,
//     threshold 0 — the same comparison G3/G4 apply end-to-end). v4
//     oklch palette shades render differently from these v3 literals
//     (probe-verified), so the components keep the literal as the
//     arbitrary-value half of text-[#hex] dark:token pairs (LoginView
//     footer precedent) and only the dark: half is new vocabulary.
//   DARK: the dark: counterpart resolves to the intended theme-aware
//     token value (computed-string equality against the .dark block /
//     Layer-2 bridge), replacing the theme-blind literal that the old
//     inline style forced in both themes.
//
// Exits non-zero on any light pixel diff or dark mismatch.

import { mkdirSync, writeFileSync } from 'node:fs'
import {
  WT, EVID, git, headSha, readBaselineSha, compileSheet,
  launchBrowser, newGateContext, writeManifest, invocationLine, resolve,
} from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase2/2b/computed'))

// The nine Stage-2B replacements: newClass exactly as written in the
// components; oldHex is the exact pre-Stage-2B inline literal; darkExpect
// is the intended dark value (token / bridge).
const pairs = [
  { label: 'sidebar-disabled-fg', newClass: 'text-[#64748b] dark:text-slate-500', oldHex: '#64748b', darkExpect: 'oklch(0.64 0.012 255)', darkFrom: '--color-slate-500 bridge (dark)' },
  { label: 'sidebar-disabled-bg', newClass: 'bg-slate-100', oldHex: '#f1f5f9', darkExpect: 'oklch(0.26 0.012 255)', darkFrom: '--color-slate-100 bridge (dark)' },
  { label: 'topbar-avatar-bg', newClass: 'bg-[var(--avatar-bg)]', oldHex: '#1e293b', darkExpect: 'oklch(0.32 0.014 255)', darkFrom: '--avatar-bg token (dark)' },
  { label: 'acad-stat-accent', newClass: 'text-[#1d4ed8] dark:text-link-strong', oldHex: '#1d4ed8', darkExpect: 'oklch(0.75 0.13 260)', darkFrom: '--link-strong token (dark)' },
  { label: 'acad-stat-ink', newClass: 'text-[#0f172a] dark:text-slate-900', oldHex: '#0f172a', darkExpect: 'oklch(0.94 0.005 255)', darkFrom: '--color-slate-900 bridge (dark)' },
  { label: 'tasks-tone-green', newClass: 'text-[#15803D] dark:text-green-700', oldHex: '#15803D', darkExpect: 'oklch(0.79 0.14 155)', darkFrom: '--color-green-700 bridge (dark)' },
  { label: 'tasks-tone-amber', newClass: 'text-[#B45309] dark:text-amber-700', oldHex: '#B45309', darkExpect: 'oklch(0.83 0.14 80)', darkFrom: '--color-amber-700 bridge (dark)' },
  { label: 'tasks-tone-red', newClass: 'text-[#DC2626] dark:text-red-600', oldHex: '#DC2626', darkExpect: 'oklch(0.66 0.18 25)', darkFrom: '--color-red-600 bridge (dark, dual-use)' },
  { label: 'tasks-tone-blue', newClass: 'text-[#2563EB] dark:text-link', oldHex: '#2563EB', darkExpect: 'oklch(0.72 0.14 260)', darkFrom: '--link token (dark)' },
]

const headGlobals = git('show HEAD:src/app/globals.css')
const allClasses = pairs.map((p) => p.newClass)
const sheet = await compileSheet({
  label: 'phase2-2b-sheet',
  globalsCss: headGlobals,
  classes: allClasses,
})

const rows = pairs
  .map((p, i) => `<div class="row" data-pair="${i}">
  <div class="pcell" data-old></div>
  <div class="pcell pnew ${p.newClass}" data-new></div>
</div>`)
  .join('\n')

const pageHtml = `<!doctype html><html><head><meta charset="utf-8"><style>${sheet.css}
.row { display:flex; gap:16px; margin:8px; }
.pcell { width:120px; height:48px; }
</style></head>
<body style="margin:0;background:#fff">
${rows}
</body></html>`
writeFileSync(resolve(sheet.dir, 'specimen.html'), pageHtml)
console.log(`2B-computed: specimen compiled at HEAD (${allClasses.length} class pairs, sheet ${sheet.css.length} B)`)

const browser = await launchBrowser()

async function runTheme(scheme) {
  const context = await newGateContext(browser)
  const page = await context.newPage()
  // The dark pass emulates the production mechanism exactly: next-themes
  // sets <html class="dark"> (attribute="class"), not a media query, so
  // the .dark cascade is driven by the class while colorScheme stays at
  // the common gate spec.
  if (scheme === 'dark') {
    await page.addInitScript(() => {
      document.addEventListener('DOMContentLoaded', () => {
        document.documentElement.classList.add('dark')
      })
    })
  }
  return { context, page }
}

const results = []
let failures = 0

// ---- LIGHT: quantized-sRGB pixel equality (old literal vs new class) ----
{
  const { context, page } = await runTheme('light')
  await page.goto(`file://${resolve(sheet.dir, 'specimen.html')}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500) // settle per common environment spec

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i]
    const oldEl = page.locator(`.row[data-pair="${i}"] [data-old]`)
    const newEl = page.locator(`.row[data-pair="${i}"] [data-new]`)
    const resolved = await newEl.evaluate((el) => {
      const cs = getComputedStyle(el)
      return { color: cs.color, backgroundColor: cs.backgroundColor }
    })
    const isBg = p.newClass.startsWith('bg-')
    const classVal = isBg ? resolved.backgroundColor : resolved.color
    // Paint both cells as solid fills: isolates the resolved color from
    // text rasterization; the pixel comparison is exact (threshold 0).
    await oldEl.evaluate((el, v) => el.style.setProperty('background-color', v), p.oldHex)
    await newEl.evaluate((el, v) => el.style.setProperty('background-color', v), classVal)
    const bufA = await oldEl.screenshot()
    const bufB = await newEl.screenshot()
    const res = await page.evaluate(
      async ({ a, b }) => {
        const load = (src) =>
          new Promise((res, rej) => {
            const img = new Image()
            img.onload = () => res(img)
            img.onerror = () => rej(new Error('image load failed'))
            img.src = src
          })
        const [ia, ib] = [await load(a), await load(b)]
        const w = Math.max(ia.width, ib.width)
        const h = Math.max(ia.height, ib.height)
        const mk = () => {
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          return c
        }
        const [ca, cb] = [mk(), mk()]
        const xa = ca.getContext('2d', { willReadFrequently: true })
        const xb = cb.getContext('2d', { willReadFrequently: true })
        xa.drawImage(ia, 0, 0)
        xb.drawImage(ib, 0, 0)
        const da = xa.getImageData(0, 0, w, h).data
        const db = xb.getImageData(0, 0, w, h).data
        let diff = 0
        let first = null
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const k = (y * w + x) * 4
            if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2] || da[k + 3] !== db[k + 3]) {
              diff++
              if (!first) first = { old: [da[k], da[k + 1], da[k + 2]], new: [db[k], db[k + 1], db[k + 2]] }
            }
          }
        }
        return { diffPixels: diff, total: w * h, first }
      },
      { a: 'data:image/png;base64,' + bufA.toString('base64'), b: 'data:image/png;base64,' + bufB.toString('base64') }
    )
    const ok = res.diffPixels === 0
    if (!ok) failures++
    results.push({
      label: p.label, theme: 'light', ok,
      oldLiteral: p.oldHex, newClass: p.newClass,
      resolvedLight: classVal,
      diffPixels: res.diffPixels, totalPixels: res.total,
      firstDiff: res.first,
    })
    console.log(`  LIGHT ${ok ? 'EXACT' : 'DIFF '}  ${p.label.padEnd(20)} ${p.oldHex} -> ${classVal}${ok ? '' : ` (${res.diffPixels}/${res.total} px differ)`}`)
  }
  await context.close()
}

// ---- DARK: dark: variant resolves to the intended token value ----
{
  const { context, page } = await runTheme('dark')
  await page.goto(`file://${resolve(sheet.dir, 'specimen.html')}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)

  const computed = await page.evaluate((count) => {
    const out = []
    for (let i = 0; i < count; i++) {
      const el = document.querySelector(`.row[data-pair="${i}"] [data-new]`)
      const cs = getComputedStyle(el)
      out.push({ color: cs.color, backgroundColor: cs.backgroundColor })
    }
    return out
  }, pairs.length)

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i]
    const isBg = p.newClass.startsWith('bg-')
    const got = isBg ? computed[i].backgroundColor : computed[i].color
    const ok = got === p.darkExpect
    if (!ok) failures++
    results.push({
      label: p.label, theme: 'dark', ok,
      newClass: p.newClass,
      resolvedDark: got,
      expectedDark: p.darkExpect,
      darkFrom: p.darkFrom,
      preStageLiteral: p.oldHex,
    })
    console.log(`  DARK  ${ok ? 'OK   ' : 'WRONG'}  ${p.label.padEnd(20)} ${got}${ok ? '' : ` (expected ${p.darkExpect})`}`)
  }
  await context.close()
}

await browser.close()

// --- evidence ---
mkdirSync(outDir, { recursive: true })
writeFileSync(`${outDir}/report.json`, JSON.stringify({
  gate: 'Phase 2 Stage 2B computed/pixel pair check',
  head: headSha(),
  baseline: readBaselineSha(),
  pairs: pairs.map((p) => ({ ...p })),
  results,
}, null, 2))
const lines = results.map((r) =>
  r.theme === 'light'
    ? `${r.ok ? 'PASS' : 'FAIL'} light  ${r.label}: ${r.oldLiteral} == ${r.resolvedLight} (${r.diffPixels}/${r.totalPixels} px differ)`
    : `${r.ok ? 'PASS' : 'FAIL'} dark   ${r.label}: ${r.newClass} -> ${r.resolvedDark}${r.ok ? '' : ` (expected ${r.expectedDark})`}`
)
writeFileSync(`${outDir}/pairs.txt`, lines.join('\n') + '\n')
writeManifest(outDir, [
  `command: ${invocationLine('phase2-2b-computed.mjs')}`,
  `exit code: ${failures ? 1 : 0}`,
  `pairs: ${pairs.length} x 2 themes (failures: ${failures})`,
  `light method: fill-paint pixel comparison, threshold 0 (old inline literal vs the new utility's resolved computed color), through the real HEAD src/app/globals.css compile (scratch dir scripts/theme-scratch/phase2-2b-sheet)`,
  `dark method: <html class="dark"> (production next-themes mechanism) + computed-string equality against the .dark token / Layer-2 bridge values`,
  `dark context note: runTheme('dark') reuses the common gate context spec but flips the html class via addInitScript; colorScheme emulation is not used for the .dark cascade itself`,
  'rationale: v4 oklch palette shades render differently from the v3 hex literals these components used (probe-verified pre-edit), so light parity requires the literal (arbitrary-value utility) and only the dark: half is new vocabulary — LoginView footer precedent (text-[#64748B] dark:text-slate-500)',
])
if (failures) {
  console.log(`\n2B-computed FAIL: ${failures} pair(s) failed — see ${outDir}/report.json`)
  process.exit(1)
}
console.log(`\n2B-computed PASS: ${pairs.length}/${pairs.length} pairs light-exact and dark-theme-aware`)
