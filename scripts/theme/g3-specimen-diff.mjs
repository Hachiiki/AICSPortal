#!/usr/bin/env node
// G3 — Specimen screenshot diff (light mode; 0 pixels).
// Plan §5.1: renders the identical specimen DOM twice — at the BASELINE
// commit with the OLD class list, and at HEAD with the NEW class list, each
// compiled with that tree's own globals.css — captures full-page screenshots
// under the common environment spec, and pixel-diffs them (threshold 0.00,
// alpha included).
//
// Command:
//   bun scripts/theme/g3-specimen-diff.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g3/
//
// Expected: 0 differing pixels (report.json -> diffPixels: 0).
//
// Hover variants are exercised at rest here (their variant rules do not
// apply without pointer state); their active-state equivalence is proven by
// G2 computed styles under real :hover, and end-to-end by G4 interaction
// captures. Focus variants ARE exercised: dedicated focused-element captures
// are taken for every focus-kind pair.

import { mkdirSync, writeFileSync } from 'node:fs'
import {
  WT, EVID, git, headSha, readBaselineSha, compileSheet,
  parseSpecimen, buildSpecimenPage, launchBrowser, newGateContext,
  pixelDiff, writeManifest, resolve,
} from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const baselineArg = argOf('--baseline', null)
const outDir = argOf('--out', `${EVID}/g3`)

const baseline = readBaselineSha()
if (baselineArg && baselineArg !== baseline) {
  console.error(`G3 FAIL: --baseline ${baselineArg} does not match the pinned baseline ${baseline}`)
  process.exit(2)
}

const pairs = parseSpecimen()
const oldClasses = pairs.map((p) => p.oldClass)
const newClasses = pairs.map((p) => p.newClass)

// --- compile both sides with each tree's own globals.css -------------------
const baselineGlobals = git(`show ${baseline}:src/app/globals.css`)
const headGlobals = git('show HEAD:src/app/globals.css')

const preSheet = await compileSheet({ label: 'g3-baseline', globalsCss: baselineGlobals, classes: oldClasses })
const postSheet = await compileSheet({ label: 'g3-head', globalsCss: headGlobals, classes: newClasses })
writeFileSync(resolve(preSheet.dir, 'specimen.html'), buildSpecimenPage(pairs, 'old'))
writeFileSync(resolve(postSheet.dir, 'specimen.html'), buildSpecimenPage(pairs, 'new'))
console.log(`G3: baseline sheet ${preSheet.css.length} B (old classes) | HEAD sheet ${postSheet.css.length} B (new classes)`)

mkdirSync(outDir, { recursive: true })
const browser = await launchBrowser()

async function capture(sheetDir, side, focusRow /* 1-based row index or null */) {
  const context = await newGateContext(browser)
  const page = await context.newPage()
  await page.goto(`file://${resolve(sheetDir, 'specimen.html')}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  if (focusRow) {
    const which = side.startsWith('baseline') ? '[data-old]' : '[data-new]'
    await page.evaluate(
      ({ row, which }) => {
        const el = document.querySelector(`.row:nth-of-type(${row}) ${which}`)
        if (el) el.focus()
      },
      { row: focusRow, which }
    )
    await page.waitForTimeout(80)
  }
  const png = resolve(outDir, focusRow ? `${side}-${focusRow}-focused.png` : `${side}.png`)
  await page.screenshot({ path: png, fullPage: true })
  await context.close()
  return png
}

// --- rest-state captures -----------------------------------------------------
const basePng = await capture(preSheet.dir, 'baseline-old', null)
const headPng = await capture(postSheet.dir, 'head-new', null)
const restDiff = await pixelDiff(browser, basePng, headPng)
if (restDiff.diffDataUrl) {
  writeFileSync(resolve(outDir, 'diff.png'), Buffer.from(restDiff.diffDataUrl.split(',')[1], 'base64'))
}

// --- focused-state captures (every focus-kind pair) --------------------------
const focusRows = pairs.map((p, i) => (p.kind === 'focus-bg' || p.kind === 'focus-text' ? i + 1 : null)).filter(Boolean)
const focusResults = []
for (const row of focusRows) {
  const b = await capture(preSheet.dir, 'baseline-old', row)
  const h = await capture(postSheet.dir, 'head-new', row)
  const d = await pixelDiff(browser, b, h)
  if (d.diffDataUrl) writeFileSync(resolve(outDir, `diff-${row}-focused.png`), Buffer.from(d.diffDataUrl.split(',')[1], 'base64'))
  focusResults.push({ row, form: pairs[row - 1].form, diffPixels: d.diffPixels, baselinePng: b, headPng: h })
}

await browser.close()

// --- report -------------------------------------------------------------------
const report = {
  gate: 'G3 specimen screenshot diff',
  baseline: baseline,
  head: headSha(),
  rest: {
    baselinePng: 'baseline-old.png',
    headPng: 'head-new.png',
    diffPng: restDiff.diffPixels ? 'diff.png' : null,
    diffPixels: restDiff.diffPixels,
    sizeBaseline: restDiff.sizeA,
    sizeHead: restDiff.sizeB,
  },
  focused: focusResults,
  expected: 'diffPixels: 0 for the rest capture and every focused capture',
}
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2))
writeManifest(outDir, [
  'command: bun scripts/theme/g3-specimen-diff.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g3/',
  `exit code: ${restDiff.diffPixels || focusResults.some((f) => f.diffPixels) ? 1 : 0}`,
  `rest capture: ${restDiff.diffPixels} differing pixels (${restDiff.sizeA} vs ${restDiff.sizeB})`,
  `focused captures: ${focusResults.map((f) => `row ${f.row} (${f.form}): ${f.diffPixels} px`).join('; ')}`,
  'method: identical single-side specimen DOM (old classes at baseline globals.css vs new classes at HEAD globals.css), full-page screenshots, exact RGBA comparison (threshold 0.00, alpha included) via Chromium canvas',
  'hover variants render at rest here (no pointer state); active-state equivalence is proven by G2 computed styles under real :hover and G4 interaction captures',
])

const totalDiff = restDiff.diffPixels + focusResults.reduce((a, f) => a + f.diffPixels, 0)
console.log(`  rest: ${restDiff.diffPixels} differing pixels (${restDiff.sizeA} vs ${restDiff.sizeB})`)
for (const f of focusResults) console.log(`  focused row ${f.row} (${f.form}): ${f.diffPixels} px`)
if (totalDiff) {
  console.log(`\nG3 FAIL: ${totalDiff} differing pixels — see ${outDir}/report.json`)
  process.exit(1)
}
console.log(`\nG3 PASS: 0 differing pixels across rest + ${focusResults.length} focused captures`)
