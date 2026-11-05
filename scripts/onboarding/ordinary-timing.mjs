// Owner-approved Rule 2, 2026-11-05. Exclusions depend only on fixture
// identities, never on the duration. Keep every raw measurement.
import { summarizeTimingRun } from './settle-timing.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export function summarizeOrdinaryTimingRun(samples) {
  if (new Set(samples.map(s => s.run)).size !== 1) throw new Error('Exactly one independent run required')
  if (samples.some(s => !Number.isFinite(s.ms) || s.ms < 0)) throw new Error('Invalid timing sample')
  const excluded = [], ordinary = []
  for (const sample of samples) {
    const reason = sample.from === 'dev-2' && sample.to === 'dev-3'
      ? 'OnboardingDev late-mount fixture, deliberate 800 ms wait'
      : sample.from === 'dev-6' && sample.to === 'dev-8'
        ? 'OnboardingDev dev-7 missing-target fixture, deliberate 1500 ms budget'
        : null
    if (reason) excluded.push({ ...sample, reason })
    else ordinary.push(sample)
  }
  const complete = summarizeTimingRun(samples), summary = summarizeTimingRun(ordinary)
  return { complete, ordinary: summary, excluded, samples,
    status: summary.advances >= 20 && summary.p95Ms <= 100 ? 'PASS' : 'FAIL' }
}

// Accept the genuine saved student-production or corrected Linux timing
// shape. Reading an old 15-ordinary-sample run will correctly FAIL the
// minimum count; changing the criterion does not create extra samples.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2)
  if (!input || !output) throw new Error('Usage: node ordinary-timing.mjs INPUT OUTPUT')
  const bytes = readFileSync(input), evidence = JSON.parse(bytes)
  const sourceRuns = evidence.rule2?.runs || evidence.rule2
  if (!Array.isArray(sourceRuns) || sourceRuns.length !== 3 || new Set(sourceRuns.map(r => r.run)).size !== 3) throw new Error('Three distinct recorded runs required')
  const runs = sourceRuns.map(r => {
    const samples = r.samples || r.cycles.filter(c => !c.discardedWarmup).flatMap(c => c.samples)
    if (samples.some(s => s.run !== undefined && s.run !== r.run)) throw new Error('Pooled or misidentified run samples')
    return { run: r.run, ...summarizeOrdinaryTimingRun(samples.map(s => ({ ...s, run: r.run }))) }
  })
  const result = { schema: 'aics-ordinary-transition-timing/v1', input: resolve(input),
    inputSHA256: createHash('sha256').update(bytes).digest('hex'), measuredAt: new Date().toISOString(),
    limitMs: 100, minimumOrdinaryAdvancesPerRun: 20, independentRuns: 3,
    definition: 'All genuine route/data transitions retained. Only the exact two artificial fixture transitions are excluded. Original raw input and warm-ups remain untouched. Uses corrected summarizeTimingRun from 221df1a.',
    status: runs.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL', runs }
  writeFileSync(output, JSON.stringify(result, null, 2))
  console.log(JSON.stringify({ status: result.status, runs: runs.map(r => ({ run: r.run, ...r.ordinary, excluded: r.excluded.length })) }))
  process.exitCode = result.status === 'PASS' ? 0 : 1
}
