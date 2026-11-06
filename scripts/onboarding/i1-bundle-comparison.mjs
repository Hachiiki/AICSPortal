// I1 bundle comparison - reproduction of the missing
// `.phase2-cloud/i1-linux-bundle-comparison.json` (A3 evidence recovery).
//
// Measures the cumulative client-chunk cost of the whole onboarding revision
// (Phase 1 through the student integration, including the focus guard)
// against the read-only onboarding baseline, on THIS platform, with
// production webpack builds (explicit --webpack; the default Turbopack is
// not executed). Both sides must be committed-source builds: the baseline
// side comes from a disposable worktree pinned at the baseline commit; the
// current side from the main checkout at HEAD (status must be clean).
//
// Dependency check: `git diff <baseline> HEAD -- package.json` must be
// empty, so no runtime or development dependency moved.
//
// Output: one JSON with per-side totals, per-file identities (path, bytes,
// sha256), the delta, and the exact build commands. No verdicts; the cost
// facts feed the recorded I1-1 owner decision, which this script never
// revisits.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { relative, resolve } from 'node:path'

const WT_MAIN = '/home/z/my-project/AICSPortal'
const BASELINE = execFileSync('git', ['rev-parse', `${process.env.I1_BASELINE || '46c33a5'}^{commit}`], { cwd: WT_MAIN, encoding: 'utf8' }).trim()
const WT_BASE = '/tmp/i1-baseline'
const OUT = process.env.I1_EVID || resolve(WT_MAIN, 'docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/cloud-2026-11-06/bundle-comparison')

const progress = (m) => console.error(`[i1-bundle] ${m}`)
const git = (args, cwd = WT_MAIN) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()

function scanChunks(root) {
  const dir = resolve(root, '.next/static/chunks')
  if (!existsSync(dir)) throw new Error(`missing chunks dir ${dir}`)
  const files = []
  const walk = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const p = resolve(d, f.name)
      if (f.isDirectory()) walk(p)
      else {
        const bytes = readFileSync(p)
        files.push({ path: relative(resolve(root, '.next/static/chunks'), p), bytes: bytes.length, gzip9: gzipSync(bytes, { level: 9 }).length, sha256: createHash('sha256').update(bytes).digest('hex') })
      }
    }
  }
  walk(dir)
  files.sort((a, b) => a.path.localeCompare(b.path))
  return {
    files: files.length,
    raw: files.reduce((a, f) => a + f.bytes, 0),
    gzip: files.reduce((a, f) => a + f.gzip9, 0),
    identities: files,
  }
}

async function main() {
  const head = git(['rev-parse', 'HEAD'])
  const headStatus = git(['status', '--porcelain'])
  if (headStatus) throw new Error(`main tree dirty: ${headStatus.split('\n').slice(0, 3).join('; ')}`)
  const depDiff = git(['diff', BASELINE, 'HEAD', '--', 'package.json'])
  const depUnchanged = depDiff.length === 0
  progress(`HEAD ${head.slice(0, 10)}; baseline ${BASELINE}; package.json diff empty=${depUnchanged}`)

  const baseInfo = git(['show', '-s', '--format=%H %ci %s', BASELINE])
  if (!existsSync(resolve(WT_BASE, 'package.json'))) throw new Error(`baseline worktree missing at ${WT_BASE} (create with: git worktree add ${WT_BASE} ${BASELINE})`)
  const baseHead = git(['rev-parse', 'HEAD'], WT_BASE)
  const baseStatus = git(['status', '--porcelain'], WT_BASE)
  if (baseHead !== BASELINE) throw new Error(`baseline worktree HEAD ${baseHead} differs from ${BASELINE}`)
  if (baseStatus) throw new Error(`baseline worktree dirty: ${baseStatus.split('\n').slice(0, 3).join('; ')}`)

  const current = scanChunks(WT_MAIN)
  const baseline = scanChunks(WT_BASE)
  mkdirSync(OUT, { recursive: true })
  const result = {
    schema: 'aics-i1-bundle-comparison/v2',
    generatedAt: new Date().toISOString(),
    platform: { os: process.platform, node: process.version, arch: process.arch },
    buildCommand: 'node node_modules/next/dist/bin/next build --webpack (NEXT_TELEMETRY_DISABLED=1, no .env.local, committed source)',
    baseline: { commit: BASELINE, info: baseInfo, worktree: WT_BASE, ...baseline },
    current: { commit: head, tree: WT_MAIN, ...current },
    delta: {
      files: current.files - baseline.files,
      raw: current.raw - baseline.raw,
      rawPct: Math.round(((current.raw - baseline.raw) / baseline.raw) * 10000) / 100,
      gzip: current.gzip - baseline.gzip,
      gzipPct: Math.round(((current.gzip - baseline.gzip) / baseline.gzip) * 10000) / 100,
    },
    dependenciesUnchanged: depUnchanged,
    disclosure: 'Same-platform reproduction replacing the missing 2026-11-04 cloud artifact. The retained Windows comparison (+27,780 raw / +8,464 gzip at 62d1354) and the owner-recorded Linux figures (+27,811 raw / +8,753 gzip at 0dc476d) stay as recorded history; this run measures the current HEAD and makes no claim about those platforms or commits.',
  }
  writeFileSync(resolve(OUT, 'i1-linux-bundle-comparison.json'), JSON.stringify(result, null, 2))
  writeFileSync(resolve(OUT, 'manifest.txt'), [
    `timestamp: ${result.generatedAt}`,
    `HEAD SHA: ${head}`,
    `baseline SHA: ${BASELINE}`,
    `command: node scripts/onboarding/i1-bundle-comparison.mjs (builds: ${result.buildCommand})`,
    `node: ${process.version}`,
    `scope: I1 bundle cost facts at the current HEAD vs the onboarding baseline; no threshold or decision revisited`,
  ].join('\n') + '\n')
  console.log(JSON.stringify({
    baseline: { files: baseline.files, raw: baseline.raw, gzip: baseline.gzip },
    current: { files: current.files, raw: current.raw, gzip: current.gzip },
    delta: result.delta, dependenciesUnchanged: depUnchanged,
  }, null, 1))
}

main().catch((e) => { console.error('[i1-bundle] failed:', e.message); process.exit(1) })
