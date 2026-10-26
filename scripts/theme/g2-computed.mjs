#!/usr/bin/env node
// G2 — Computed-style equality in headless Chromium (light mode).
// Plan §5.1: proves the migrated classes resolve identically through a real
// browser cascade — catches @supports branch selection, color-mix()
// resolution, and cascade subtleties that static parsing cannot.
//
// Command:
//   bun scripts/theme/g2-computed.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g2/
//
// Expected: 0 mismatches across all pairs x all properties.

import { mkdirSync, writeFileSync } from 'node:fs'
import {
  WT, EVID, git, headSha, readBaselineSha, compileSheet,
  parseSpecimen, buildSpecimenPage, launchBrowser, newGateContext,
  writeManifest, invocationLine, resolve,
} from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', `${EVID}/g2`)

const PROPS = [
  'color',
  'background-color',
  'background-image',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'box-shadow',
  'text-decoration-color',
  'accent-color',
]

const pairs = parseSpecimen()
const headGlobals = git('show HEAD:src/app/globals.css')

// ONE specimen stylesheet containing BOTH vocabularies, compiled through
// the real HEAD globals.css (explicit source inventory).
const allClasses = pairs.flatMap((p) => [p.oldClass, p.newClass])
const sheet = await compileSheet({
  label: 'g2-sheet',
  globalsCss: headGlobals,
  classes: allClasses,
})
const pageHtml = buildSpecimenPage(pairs, 'paired')
writeFileSync(resolve(sheet.dir, 'specimen.html'), pageHtml)
console.log(`G2: specimen compiled at HEAD (${allClasses.length} classes, sheet ${sheet.css.length} B)`)

const browser = await launchBrowser()
const context = await newGateContext(browser)
const page = await context.newPage()
await page.goto(`file://${resolve(sheet.dir, 'specimen.html')}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500) // settle per common environment spec

const readProps = (el, pseudo) =>
  page.evaluate(
    ({ sel, props, pseudo }) => {
      const target = document.querySelector(sel)
      if (!target) return null
      const cs = getComputedStyle(target, pseudo || null)
      const out = {}
      for (const p of props) out[p] = cs.getPropertyValue(p)
      return out
    },
    { sel: el, props: PROPS, pseudo: pseudo || null }
  )

const results = []
let mismatches = 0
let skipped = 0

for (let i = 0; i < pairs.length; i++) {
  const p = pairs[i]
  const oldSel = `[data-old]:nth-of-type(${''})` // placeholder, real selection below
  const row = i + 1
  const oldEl = `.row:nth-of-type(${row}) [data-old]`
  const newEl = `.row:nth-of-type(${row}) [data-new]`
  let oldVals = null
  let newVals = null
  let mode = 'static'
  let note = ''

  try {
    if (p.kind === 'hover-bg' || p.kind === 'hover-text') {
      mode = 'hover'
      await page.hover(oldEl)
      await page.waitForTimeout(80)
      oldVals = await readProps(oldEl)
      await page.hover(newEl)
      await page.waitForTimeout(80)
      newVals = await readProps(newEl)
    } else if (p.kind === 'focus-bg' || p.kind === 'focus-text') {
      mode = 'focus'
      await page.focus(oldEl)
      await page.waitForTimeout(80)
      oldVals = await readProps(oldEl)
      await page.focus(newEl)
      await page.waitForTimeout(80)
      newVals = await readProps(newEl)
    } else if (p.kind === 'file-bg') {
      mode = 'pseudo'
      oldVals = await readProps(oldEl, '::file-selector-button')
      newVals = await readProps(newEl, '::file-selector-button')
      const meaningful = (v) => v && Object.values(v).some((x) => x && x !== '' && x !== 'none' && x !== 'rgba(0, 0, 0, 0)')
      if (!meaningful(oldVals) && !meaningful(newVals)) {
        // Chromium cannot compute the pseudo — record the skip honestly;
        // G3's specimen render and G4's route pixels cover this end-to-end.
        skipped++
        results.push({ form: p.form, kind: p.kind, mode, skipped: true, note: 'getComputedStyle(el, "::file-selector-button") returned no computable values in headless Chromium; covered instead by G3 specimen pixels (input renders its button) and G4 route captures (faculty my-students renders the real file input)' })
        continue
      }
      note = 'pseudo-element computed via ::file-selector-button'
    } else {
      oldVals = await readProps(oldEl)
      newVals = await readProps(newEl)
      if (p.kind === 'supports-bg') {
        note = 'supports-[backdrop-filter] variant: Chromium satisfies the @supports condition'
      }
    }
  } catch (e) {
    mismatches++
    results.push({ form: p.form, kind: p.kind, mode, error: String(e) })
    continue
  }

  if (!oldVals || !newVals) {
    mismatches++
    results.push({ form: p.form, kind: p.kind, mode, error: 'element not found' })
    continue
  }

  const pairMismatches = []
  for (const prop of PROPS) {
    if (oldVals[prop] !== newVals[prop]) {
      pairMismatches.push({ prop, old: oldVals[prop], new: newVals[prop] })
    }
  }
  if (pairMismatches.length) mismatches++
  results.push({
    form: p.form,
    kind: p.kind,
    mode,
    note,
    equal: pairMismatches.length === 0,
    mismatches: pairMismatches,
    oldValues: oldVals,
    newValues: newVals,
  })
}

await browser.close()

// --- evidence ---
mkdirSync(outDir, { recursive: true })
writeFileSync(`${outDir}/computed.json`, JSON.stringify({ gate: 'G2 computed-style equality', head: headSha(), props: PROPS, results }, null, 2))
const mismLines = results.flatMap((r) =>
  r.error
    ? [`ERROR ${r.form}: ${r.error}`]
    : r.skipped
      ? [`SKIPPED ${r.form}: ${r.note}`]
      : (r.mismatches || []).map((m) => `MISMATCH ${r.form} [${r.mode}] ${m.prop}: old=${m.old} new=${m.new}`)
)
writeFileSync(`${outDir}/mismatches.txt`, mismLines.join('\n') + (mismLines.length ? '\n' : ''))
writeManifest(outDir, [
  `command: ${invocationLine('g2-computed.mjs')}`,
  `exit code: ${mismatches ? 1 : 0}`,
  `pairs: ${results.length} (mismatches: ${mismatches}, skipped: ${skipped})`,
  `properties: ${PROPS.join(', ')}`,
  `environment: headless Chromium ${process.env.GATE_CHROMIUM || '(playwright bundled)'}, viewport 1280x800, deviceScaleFactor 1, colorScheme light, prefers-reduced-motion reduce, networkidle + 500ms settle`,
  'sheet: single compile at HEAD containing BOTH vocabularies through the real src/app/globals.css (scratch dir scripts/theme-scratch/g2-sheet)',
])

console.log(results.map((r) => `  ${r.error ? 'ERR ' : r.skipped ? 'SKIP' : r.equal ? 'PASS' : 'FAIL'}  ${r.form}${r.mode !== 'static' ? ` [${r.mode}]` : ''}`).join('\n'))
if (mismatches) {
  console.log(`\nG2 FAIL: ${mismatches} pair(s) with computed-style mismatches — see ${outDir}/computed.json`)
  process.exit(1)
}
console.log(`\nG2 PASS: ${results.filter((r) => r.equal).length}/${results.length} pairs identical across ${PROPS.length} properties${skipped ? ` (${skipped} skipped, documented)` : ''}`)
