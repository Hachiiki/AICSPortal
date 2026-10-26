// Shared library for the dark-theme acceptance gates (G1–G4).
// Plan reference: docs/dark-theme-phase1-plan.md §5.1.
//
// Conventions:
// - The dev worktree is the "post" side; the pinned baseline SHA is the
//   "pre" side. The pinned file lives at
//   docs/done/qa_evidence/ui-ux/dark-theme/<phase>/baseline-sha.txt —
//   phase0 for the Phase-0 run (the migration baseline 822a5cfd), phase1
//   for the Phase-1 re-run (the Phase-0 exit commit acbe71a, per plan
//   §5.1 "Phase-1 re-run"). GATE_EVID selects the phase evidence root
//   (default: phase0); the pinned Phase-0 baseline is never rewritten.
// - Baseline sources are read via `git show` (no worktree needed) for
//   G1/G3; G4 builds a real baseline scratch worktree (see
//   g4-route-diff.mjs).
// - Every gate writes a manifest.txt recording baseline SHA, HEAD SHA,
//   the actual command line and gate-relevant environment, exit codes,
//   timestamps, and any documented deviations.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import { chromium } from 'playwright'

export const WT = process.env.GATE_WT || '/home/z/my-project/AICSPortal'
export const EVID = process.env.GATE_EVID
  ? resolve(WT, process.env.GATE_EVID)
  : resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase0')
export const SCRATCH_ROOT = process.env.GATE_SCRATCH || '/home/z/my-project/AICSPortal/scripts/theme-scratch'
export const FIXED_TIME = '2026-10-24T09:00:00'

/** The gate invocation, as actually run (argv + gate env), for manifests. */
export function invocationLine(scriptName) {
  const env = []
  for (const k of ['GATE_WT', 'GATE_EVID', 'GATE_SCRATCH', 'GATE_MAIN_WT', 'GATE_BASELINE_WT']) {
    if (process.env[k]) env.push(`${k}=${process.env[k]}`)
  }
  return `${env.length ? env.join(' ') + ' ' : ''}bun scripts/theme/${scriptName} ${process.argv.slice(2).join(' ')}`.trim()
}

// ---------------------------------------------------------------------------
// git helpers
// ---------------------------------------------------------------------------

export function git(args, opts = {}) {
  return execFileSync('git', args.split(' '), {
    cwd: WT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  }).trim()
}

export function readBaselineSha() {
  const p = resolve(EVID, 'baseline-sha.txt')
  if (!existsSync(p)) {
    throw new Error(`baseline SHA not pinned: ${p} missing — a gate run without a recorded baseline is invalid (plan §5.1)`)
  }
  const sha = readFileSync(p, 'utf8').trim()
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`invalid baseline SHA: ${sha}`)
  return sha
}

export function headSha() {
  return git('rev-parse HEAD')
}

// ---------------------------------------------------------------------------
// Compile an explicit class inventory through the project's own Tailwind
// pipeline in an isolated scratch dir (node_modules symlink -> dev worktree).
// ---------------------------------------------------------------------------

export async function compileSheet({ label, globalsCss, classes, contentHtml }) {
  const dir = resolve(SCRATCH_ROOT, label)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const globalsPath = resolve(dir, 'globals.css')
  writeFileSync(globalsPath, globalsCss)
  // The content file is the explicit source inventory: only the classes it
  // contains are compiled. Tailwind v4 auto-detection scans from the
  // PROCESS CWD (empirically verified), so we chdir into the scratch dir
  // for the compile and restore afterwards.
  writeFileSync(
    resolve(dir, 'content.html'),
    contentHtml ?? `<div class="${classes.join(' ')}">x</div>`
  )
  const nm = resolve(dir, 'node_modules')
  if (!existsSync(nm)) symlinkSync(resolve(WT, 'node_modules'), nm)

  const prevCwd = process.cwd()
  process.chdir(dir)
  try {
    const result = await postcss([tailwindcss()]).process(globalsCss, {
      from: globalsPath,
      to: resolve(dir, 'out.css'),
    })
    writeFileSync(resolve(dir, 'out.css'), result.css)
    return { dir, css: result.css, outPath: resolve(dir, 'out.css') }
  } finally {
    process.chdir(prevCwd)
  }
}

// ---------------------------------------------------------------------------
// Emitted-CSS parsing: custom-property resolution + utility rule extraction
// ---------------------------------------------------------------------------

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function unescapeSelector(sel) {
  return sel.replace(/\\(.)/g, '$1')
}

/** Collect light-mode (:root/:host) custom properties from an emitted sheet. */
export function collectVars(css) {
  const root = postcss.parse(css)
  const vars = new Map()
  root.walkRules((rule) => {
    const sels = rule.selector.split(',').map((s) => s.trim())
    if (!sels.some((s) => s === ':root' || s === ':host' || s === 'html')) return
    for (const decl of rule.nodes) {
      if (decl.type === 'decl' && decl.prop.startsWith('--')) {
        vars.set(decl.prop, decl.value) // later wins, matching the cascade
      }
    }
  })
  return vars
}

/**
 * Find the emitted declaration for a utility class.
 * Returns { winner, fallback, media, supportsVariant } where `winner` is the
 * declaration inside `@supports (color: color-mix(...))` (the branch that
 * wins in modern browsers) when present, else the base declaration.
 */
export function findUtilityDecl(css, cls) {
  const root = postcss.parse(css)
  const wanted = new RegExp(`^\\.${escapeRe(cls)}(:hover|:focus|::file-selector-button|:focus-visible|:active)?$`)
  let winner = null
  let fallback = null
  let media = null
  let supportsVariant = false
  root.walkRules((rule) => {
    const sel = unescapeSelector(rule.selector)
    if (!wanted.test(sel)) return
    // Determine nesting context ABOVE the rule (@media / @supports wrappers)
    let node = rule.parent
    let inColorMixSupportsAbove = false
    let inMedia = null
    while (node && node.type !== 'root') {
      if (node.type === 'atrule') {
        if (node.params && node.params.includes('color-mix')) inColorMixSupportsAbove = true
        if (node.name === 'media') inMedia = node.params
        else if (node.name === 'supports' && !node.params.includes('color-mix')) supportsVariant = true
      }
      node = node.parent
    }
    media = inMedia
    // Declarations: direct children are the fallback; declarations inside
    // nested @supports (color: color-mix(...)) children are the winner
    // (that branch wins in modern browsers).
    const scan = (nodes, inSupports) => {
      for (const child of nodes) {
        if (child.type === 'decl') {
          if (inSupports) winner = { prop: child.prop, value: child.value }
          else if (!fallback) fallback = { prop: child.prop, value: child.value }
        } else if (child.type === 'atrule' && child.name === 'supports' && child.params && child.params.includes('color-mix')) {
          scan(child.nodes, true)
        } else if (child.type === 'atrule' && child.nodes) {
          scan(child.nodes, inSupports)
        }
      }
    }
    scan(rule.nodes, inColorMixSupportsAbove)
  })
  if (!winner) winner = fallback
  return { winner, fallback, media, supportsVariant }
}

/** Recursively substitute var() references. */
export function resolveValue(value, vars, depth = 0) {
  if (depth > 12) return value
  const re = /var\((--[a-zA-Z0-9_-]+)(?:,\s*([^()]*))?\)/
  let out = value
  let guard = 0
  while (re.test(out) && guard++ < 64) {
    const m = re.exec(out)
    const name = m[1]
    const hasDefault = m[2] !== undefined
    const resolved = vars.has(name) ? vars.get(name) : hasDefault ? m[2] : `unresolved:${name}`
    out = out.replace(m[0], resolved)
  }
  return out
}

/** Normalize color notation for comparison: hex expansion/case, oklch
 * percentages, whitespace. Notation-insensitive, value-exact. */
export function normalizeColor(s) {
  let out = s.replace(/\s+/g, ' ').trim().toLowerCase()
  out = out.replace(/#([0-9a-f])([0-9a-f])([0-9a-f])\b/g, '#$1$1$2$2$3$3')
  out = out.replace(/oklch\(\s*([0-9.]+)%/g, (_m, p) => {
    const dec = (parseFloat(p) / 100).toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0')
    return `oklch(${dec}`
  })
  return out
}

// ---------------------------------------------------------------------------
// Specimen (single source of truth: scripts/theme/specimen.html)
// ---------------------------------------------------------------------------

export const SPECIMEN_PATH = resolve(WT, 'scripts/theme/specimen.html')

/**
 * Parse specimen.html into pair descriptors (line-based, robust to void
 * elements like <input>). The file format guarantees one element per line,
 * each pair's old element (data-old) immediately followed by its new
 * element (data-new).
 */
export function parseSpecimen() {
  const html = readFileSync(SPECIMEN_PATH, 'utf8')
  const lines = html.split('\n')
  const extract = (line) => {
    const m = line.match(/<([a-z]+)([^>]*)>/)
    if (!m) return null
    const tag = m[1]
    const attrs = m[2]
    const cls = (attrs.match(/class="([^"]*)"/) || [])[1] || ''
    const style = (attrs.match(/style="([^"]*)"/) || [])[1] || ''
    const isOld = /\bdata-old=/.test(attrs)
    const isNew = /\bdata-new=/.test(attrs)
    if (!isOld && !isNew) return null
    const rest = line.slice(m.index + m[0].length)
    const im = rest.match(/^([^<]*)<\/[a-z]+>/)
    const inner = im ? im[1] : ''
    return { tag, cls, style, side: isOld ? 'old' : 'new', inner }
  }
  const olds = []
  const news = []
  for (const line of lines) {
    const el = extract(line)
    if (!el) continue
    if (el.side === 'old') olds.push(el)
    else news.push(el)
  }
  if (!olds.length || olds.length !== news.length) {
    throw new Error(`specimen parse failed: ${olds.length} old / ${news.length} new elements in ${SPECIMEN_PATH}`)
  }
  const pairs = olds.map((o, i) => {
    const n = news[i]
    const oldCls = o.cls
    const newCls = n.cls
    let kind = 'bg'
    if (/text-blue|text-link/.test(oldCls)) {
      kind = oldCls.startsWith('hover:') ? 'hover-text' : oldCls.startsWith('focus:') ? 'focus-text' : 'text'
    } else if (oldCls.startsWith('hover:')) kind = 'hover-bg'
    else if (oldCls.startsWith('focus:')) kind = 'focus-bg'
    else if (oldCls.startsWith('file:')) kind = 'file-bg'
    else if (oldCls.startsWith('supports-')) kind = 'supports-bg'
    return {
      form: `${oldCls} -> ${newCls}`,
      oldClass: oldCls,
      newClass: newCls,
      kind,
      tag: o.tag,
      style: o.style || n.style,
      oldInner: o.inner,
      newInner: n.inner,
    }
  })
  return pairs
}

/** Build an HTML page containing one side of every pair (or both, paired). */
export function buildSpecimenPage(pairs, side /* 'old' | 'new' | 'paired' */) {
  const VOID = new Set(['input'])
  const rows = pairs
    .map((p, i) => {
      const label = String(i + 1).padStart(2, '0')
      const mk = (which) => {
        const cls = which === 'old' ? p.oldClass : p.newClass
        const inner = which === 'old' ? p.oldInner : p.newInner
        const style = p.style || 'width:180px;height:72px'
        const attrs = p.tag === 'a' ? ' href="#" onclick="return false"' : p.tag === 'input' ? ' type="file"' : ''
        if (VOID.has(p.tag)) {
          return `      <${p.tag}${attrs} data-${which} class="${cls}" style="${style}">`
        }
        return `      <${p.tag}${attrs} data-${which} class="${cls}" style="${style}">${inner}</${p.tag}>`
      }
      const cells = side === 'paired' ? `${mk('old')}\n${mk('new')}` : mk(side)
      return `  <div class="row">\n    <div class="label">${label}</div>\n    <div class="cells">\n${cells}\n    </div>\n  </div>`
    })
    .join('\n')
  const cols = side === 'paired' ? 'grid-template-columns: repeat(2, 180px);' : 'grid-template-columns: 180px;'
  return `<!doctype html>
<html><head><meta charset="utf-8">
<!-- GENERATED for gate runs from scripts/theme/specimen.html (${side} variant) -->
<style>
  body { margin: 0; padding: 16px; background: #f8fafc; font: 14px/1.2 sans-serif; }
  .row { display: flex; align-items: center; gap: 16px; padding: 6px 0; }
  .label { width: 24px; color: #64748b; font: 12px/1 sans-serif; }
  .cells { display: grid; ${cols} gap: 8px; }
</style>
<link rel="stylesheet" href="out.css">
</head>
<body>
${rows}
</body></html>
`
}

// ---------------------------------------------------------------------------
// Skeleton presence probe (Stage 2A, issue #92 follow-up)
// ---------------------------------------------------------------------------

/**
 * Probe a skeleton-loading page state: how many .aics-skeleton blocks are
 * in the DOM, and whether the first one is actually rendered (visible, has
 * a box). G4's capturePass fails the interaction-skeleton-loading capture
 * when count === 0 or the first block is invisible, so a vacuous capture
 * (the Phase-0 defect: both sides rendering an empty page) can never pass
 * silently. Exported so g4-skeleton-negative.mjs exercises the exact same
 * predicate — the negative control cannot drift from the real assertion.
 */
export async function skeletonPresence(page) {
  const count = await page.locator('.aics-skeleton').count()
  const firstVisible = count > 0 ? await page.locator('.aics-skeleton').first().isVisible() : false
  return { count, firstVisible }
}

// ---------------------------------------------------------------------------
// Browser environment (common spec, plan §5.1): headless Chromium, 1280x800,
// dsf 1, light color scheme, reduced motion.
// ---------------------------------------------------------------------------

export async function launchBrowser() {
  return chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--force-color-profile=srgb',
      '--hide-scrollbars',
    ],
  })
}

export async function newGateContext(browser) {
  return browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  })
}

// ---------------------------------------------------------------------------
// Pixel diff (zero new dependencies: Chromium canvas does the comparison)
// ---------------------------------------------------------------------------

export async function pixelDiff(browser, pngA, pngB) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  const a = 'data:image/png;base64,' + readFileSync(pngA).toString('base64')
  const b = 'data:image/png;base64,' + readFileSync(pngB).toString('base64')
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
      const [ca, cb, cd] = [mk(), mk(), mk()]
      const xa = ca.getContext('2d', { willReadFrequently: true })
      const xb = cb.getContext('2d', { willReadFrequently: true })
      const xd = cd.getContext('2d')
      xa.drawImage(ia, 0, 0)
      xb.drawImage(ib, 0, 0)
      xd.fillStyle = '#ffffff'
      xd.fillRect(0, 0, w, h)
      const da = xa.getImageData(0, 0, w, h).data
      const db = xb.getImageData(0, 0, w, h).data
      let diff = 0
      // Bounding box of differing pixels: lets Phase-1 runs prove that
      // pixel changes are confined to the new theme controls.
      let minX = null
      let minY = null
      let maxX = null
      let maxY = null
      const mark = xd.createImageData(1, 1)
      mark.data[0] = 255
      mark.data[3] = 255
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4
          if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2] || da[i + 3] !== db[i + 3]) {
            diff++
            if (minX === null || x < minX) minX = x
            if (minY === null || y < minY) minY = y
            if (maxX === null || x > maxX) maxX = x
            if (maxY === null || y > maxY) maxY = y
            xd.putImageData(mark, x, y)
          }
        }
      }
      return {
        diffPixels: diff,
        width: w,
        height: h,
        sizeA: `${ia.width}x${ia.height}`,
        sizeB: `${ib.width}x${ib.height}`,
        bbox: diff ? { minX, minY, maxX, maxY } : null,
        diffDataUrl: diff ? cd.toDataURL('image/png') : null,
      }
    },
    { a, b }
  )
  await ctx.close()
  return res
}

// ---------------------------------------------------------------------------
// Manifest / evidence helpers
// ---------------------------------------------------------------------------

export function writeManifest(outDir, lines) {
  mkdirSync(outDir, { recursive: true })
  const ts = new Date().toISOString()
  const body = [
    `timestamp: ${ts}`,
    `baseline SHA: ${readBaselineSha()}`,
    `HEAD SHA: ${headSha()}`,
    `worktree: ${WT}`,
    ...lines,
  ].join('\n')
  writeFileSync(resolve(outDir, 'manifest.txt'), body + '\n')
  return body
}

export { readFileSync, writeFileSync, mkdirSync, existsSync, resolve, basename }
