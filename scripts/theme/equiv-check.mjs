#!/usr/bin/env node
// G1 — Token-resolution equivalence (static; re-runnable).
// Plan §5.1: proves every §2.5 old->new mapping resolves to the identical
// computed value in light mode at the token level — including /alpha
// modifiers, hover:/focus:/file:/supports- prefixed forms, and the
// @supports color-mix branch that wins in modern browsers.
//
// Command:
//   bun scripts/theme/equiv-check.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g1/
//
// Expected: exit 0; report.json shows every pair identical.
// On failure: exits non-zero; report prints both resolved values per failing pair.

import { mkdirSync, writeFileSync } from 'node:fs'
import {
  WT, EVID, git, readBaselineSha, headSha, compileSheet,
  collectVars, findUtilityDecl, resolveValue, normalizeColor,
  parseSpecimen, writeManifest,
} from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const baselineArg = argOf('--baseline', null)
const outDir = argOf('--out', `${EVID}/g1`)

const baseline = readBaselineSha()
if (baselineArg && baselineArg !== baseline) {
  console.error(`G1 FAIL: --baseline ${baselineArg} does not match the pinned baseline ${baseline}`)
  process.exit(2)
}

const pairs = parseSpecimen()
console.log(`G1: ${pairs.length} mapping forms from specimen; baseline ${baseline.slice(0, 10)} -> HEAD ${headSha().slice(0, 10)}`)

// --- 1. Extract the pre-migration inventory from the BASELINE tree --------
const grepRe =
  '(?<![\\w.-])((?:[a-z]+(?=:))?:)?(bg-white|text-blue-(600|700|800)|bg-slate-900)(/\\d+)?(?![\\w-])'
let preInventory = ''
try {
  preInventory = git(`grep -oP ${grepRe} ${baseline} -- src/`)
} catch {
  preInventory = ''
}
const preCounts = {}
for (const line of preInventory.split('\n').filter(Boolean)) {
  const tok = line.replace(/^[^:]+:\d+:/, '')
  preCounts[tok] = (preCounts[tok] || 0) + 1
}

// --- 2. Extract the post-migration inventory from HEAD --------------------
let postInventory = ''
try {
  postInventory = git(`grep -oP (?<![\\w.-])((?:[a-z]+(?=:))?:)?(bg-surface|text-link(-strong|-deep)?|bg-scrim)(/\\d+)?(?![\\w-]) HEAD -- src/`)
} catch {
  postInventory = ''
}
const postCounts = {}
for (const line of postInventory.split('\n').filter(Boolean)) {
  const tok = line.replace(/^[^:]+:\d+:/, '')
  postCounts[tok] = (postCounts[tok] || 0) + 1
}

// --- 3. Compile both sides through the project's own Tailwind pipeline ----
const baselineGlobals = git(`show ${baseline}:src/app/globals.css`)
const headGlobals = git('show HEAD:src/app/globals.css')
const oldClasses = pairs.map((p) => p.oldClass)
const newClasses = pairs.map((p) => p.newClass)

const pre = await compileSheet({ label: 'g1-pre', globalsCss: baselineGlobals, classes: oldClasses })
const post = await compileSheet({ label: 'g1-post', globalsCss: headGlobals, classes: newClasses })
console.log(`G1: compiled pre (${pre.css.length} B) and post (${post.css.length} B) sheets`)

const preVars = collectVars(pre.css)
const postVars = collectVars(post.css)

// --- 4. Pairwise resolution + equality assertion ---------------------------
const results = []
let failures = 0
for (const p of pairs) {
  const prop = /(^|:)text-/.test(p.oldClass) ? 'color' : 'background-color'
  const preDecl = findUtilityDecl(pre.css, p.oldClass)
  const postDecl = findUtilityDecl(post.css, p.newClass)
  if (!preDecl.winner || !postDecl.winner) {
    failures++
    results.push({ ...p, prop, error: 'missing utility rule', preFound: !!preDecl.winner, postFound: !!postDecl.winner })
    continue
  }
  const preResolved = normalizeColor(resolveValue(preDecl.winner.value, preVars))
  const postResolved = normalizeColor(resolveValue(postDecl.winner.value, postVars))
  const equal = preResolved === postResolved
  if (!equal) failures++
  // Fallback lines (informational — documented asymmetry, plan R7)
  const preFallback = preDecl.fallback ? normalizeColor(resolveValue(preDecl.fallback.value, preVars)) : null
  const postFallback = postDecl.fallback ? normalizeColor(resolveValue(postDecl.fallback.value, postVars)) : null
  results.push({
    form: p.form,
    kind: p.kind,
    prop,
    preWinner: preResolved,
    postWinner: postResolved,
    equal,
    preFallback,
    postFallback,
    fallbackAsymmetric: preFallback !== postFallback,
  })
}

// --- 5. Evidence bundle -----------------------------------------------------
mkdirSync(outDir, { recursive: true })
const report = {
  gate: 'G1 token-resolution equivalence',
  baseline: baseline,
  head: headSha(),
  pairsTotal: results.length,
  pairsEqual: results.filter((r) => r.equal).length,
  failures,
  expected: 'every pair identical (winner = @supports color-mix branch)',
  results,
}
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2))
writeFileSync(
  `${outDir}/resolved-pairs.tsv`,
  ['form\tprop\tpre-resolved\tpost-resolved\tequal\tpre-fallback\tpost-fallback']
    .concat(
      results.map((r) =>
        [
          r.form, r.prop, r.preWinner ?? 'MISSING', r.postWinner ?? 'MISSING', r.equal,
          r.preFallback ?? '-', r.postFallback ?? '-',
        ].join('\t')
      )
    )
    .join('\n') + '\n'
)
writeFileSync(
  `${outDir}/pre-inventory.txt`,
  `# pre-migration utility inventory (baseline ${baseline}, git grep -oP over src/)\n` +
    `# pattern: ${grepRe}\n` +
    Object.entries(preCounts).sort().map(([k, v]) => `${v}\t${k}`).join('\n') +
    `\n# total occurrences: ${Object.values(preCounts).reduce((a, b) => a + b, 0)}\n`
)
writeFileSync(
  `${outDir}/post-inventory.txt`,
  `# post-migration utility inventory (HEAD ${headSha()}, git grep -oP over src/)\n` +
    Object.entries(postCounts).sort().map(([k, v]) => `${v}\t${k}`).join('\n') +
    `\n# total occurrences: ${Object.values(postCounts).reduce((a, b) => a + b, 0)}\n`
)
const tsv = results.map((r) => `  ${r.equal ? 'PASS' : 'FAIL'}  ${r.form}\t${r.prop}: ${r.preWinner} == ${r.postWinner}`)
writeManifest(outDir, [
  'command: bun scripts/theme/equiv-check.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g1/',
  `exit code: ${failures ? 1 : 0}`,
  `pairs: ${results.length} (failures: ${failures})`,
  'method: both sides compiled with the project @tailwindcss/postcss v4.3.3; values resolved against light-mode :root custom properties; winner branch = @supports (color: color-mix(...)) per plan §5.1/§2.5',
  'fallback asymmetry (static color-mix(in srgb) vs var()) is documented, not a failure — plan R7; browser floor unchanged',
])

console.log(tsv.join('\n'))
if (failures) {
  console.log(`\nG1 FAIL: ${failures} mismatching pair(s) — see ${outDir}/report.json`)
  process.exit(1)
}
console.log(`\nG1 PASS: ${results.length}/${results.length} pairs resolve identically in light mode`)
