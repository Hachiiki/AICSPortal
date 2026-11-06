// Offline re-attribution of a saved i2r2 CDP trace, after the profile
// thread-matching fix (Profile/ProfileChunk events arrive on the V8 sampler
// tid; they match by process, not by main-thread tid). Re-parses the trace
// recorded by i2r2-student-cloud-timing.mjs and updates the attribution
// block of the recorded result JSON in place. The measured series is never
// recomputed here; only the parser output changes.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { attributeTrace } from './i2r2-student-cloud-timing.mjs'

const [traceFile, resultFile] = process.argv.slice(2)
if (!traceFile || !resultFile) throw new Error('Usage: node i2r2-trace-reparse.mjs TRACE RESULT_JSON')
const chunks = JSON.parse(readFileSync(traceFile, 'utf8'))
const attribution = await attributeTrace(traceFile, chunks)
const result = JSON.parse(readFileSync(resultFile, 'utf8'))
const prior = result.rule3Attribution
result.rule3Attribution = {
  ...attribution,
  trace: { ...prior?.trace, sha256: attribution.trace?.sha256 ?? prior?.trace?.sha256 },
  reparse: {
    disclosure: 'Attribution re-parsed offline from the SAME recorded trace after a profile thread-matching fix (Profile/ProfileChunk events match by process, not main-thread tid). The measured series was not recomputed.',
    priorLongTaskCount: prior?.longTaskCount ?? null,
    priorTourHandlerFrameHits: prior?.tourHandlerFrameHits ?? null,
  },
}
writeFileSync(resolve(resultFile), JSON.stringify(result, null, 2))
console.log(JSON.stringify({
  longTaskCount: attribution.longTaskCount,
  longTasks: attribution.longTasks.slice(0, 5).map((t) => ({ durationMs: t.durationMs, timelineMs: t.timelineMs, top: t.topFunctions.slice(0, 4), jsSampleCount: t.jsSampleCount })),
  tourHandlerFrameHits: attribution.tourHandlerFrameHits,
  conclusion: attribution.conclusion,
}, null, 1))
