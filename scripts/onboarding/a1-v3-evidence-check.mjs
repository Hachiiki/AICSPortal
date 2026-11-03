// Acceptance/rejection checks against genuine executed evidence. Mutations
// stay in fresh temporary copies; the original run is never edited.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, unlinkSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { verifyA1V3Run } from './a1-v3-evidence.mjs'
const source = resolve(process.env.A1_CHECK_EVID || '.phase2-local/final-a1-attempt2/prod-smoke')
const result = JSON.parse(readFileSync(resolve(source, 'result.json'))), head = result.source.head
const out = { checkedAt: new Date().toISOString(), evidence: source, head, cases: [] }
const hash = b => createHash('sha256').update(b).digest('hex')
const verify = directory => verifyA1V3Run(directory, process.cwd(), head)
out.positive = verify(source)
out.cases.push({ name: 'accepts genuine build and Next bracketed route filenames', rejected: false, pass: true })
const copies = mkdtempSync(resolve(tmpdir(), 'aics-a1-reader-check-'))
const records = JSON.parse(readFileSync(resolve(source, 'artifact-integrity.json'))).artifacts
const names = ['artifact-integrity.json', ...records.map(r => r.name), ...result.producer.map(f => 'producer/' + f.name), ...result.observations.scan.chunks.map(c => c.artifact)]
const rewrite = (directory, name, value) => {
  const bytes = Buffer.from(JSON.stringify(value, null, 2)); writeFileSync(resolve(directory, name), bytes)
  const manifest = JSON.parse(readFileSync(resolve(directory, 'artifact-integrity.json')))
  const record = manifest.artifacts.find(r => r.name === name)
  if (record) { record.bytes = bytes.length; record.sha256 = hash(bytes); writeFileSync(resolve(directory, 'artifact-integrity.json'), JSON.stringify(manifest, null, 2)) }
}
const check = (name, mutate) => {
  const directory = resolve(copies, String(out.cases.length)); mkdirSync(directory)
  for (const file of names) { mkdirSync(dirname(resolve(directory, file)), { recursive: true }); copyFileSync(resolve(source, file), resolve(directory, file)) }
  mutate(directory)
  try { verify(directory); out.cases.push({ name, rejected: false, pass: false }) }
  catch (error) { out.cases.push({ name, rejected: true, pass: true, reason: error.message }) }
}
check('rejects a failed assertion even when result hashes are recomputed', directory => { const r = structuredClone(result); r.assertions[0].ok = false; rewrite(directory, 'result.json', r) })
check('rejects an omitted required assertion', directory => { const r = structuredClone(result); r.assertions = r.assertions.filter(a => a.id !== 'real-student-tour'); rewrite(directory, 'result.json', r) })
check('rejects unreviewed producer bytes and a self-supplied fingerprint', directory => {
  const r = structuredClone(result), bytes = Buffer.from('// unreviewed producer')
  writeFileSync(resolve(directory, 'producer', r.producer[0].name), bytes); r.producer[0].sha256 = hash(bytes); r.producerFingerprint = hash(JSON.stringify(r.producer))
  const execution = JSON.parse(readFileSync(resolve(directory, 'execution.json'))); execution.producer = r.producer; execution.producerFingerprint = r.producerFingerprint
  rewrite(directory, 'execution.json', execution); rewrite(directory, 'result.json', r)
})
check('rejects altered raw chunk bytes despite recomputed metadata', directory => {
  const r = structuredClone(result), scan = structuredClone(r.observations.scan), chunk = scan.chunks[0]
  const bytes = Buffer.concat([readFileSync(resolve(directory, chunk.artifact)), Buffer.from(' dev-tour-launcher')])
  writeFileSync(resolve(directory, chunk.artifact), bytes); chunk.bytes = bytes.length; chunk.sha256 = hash(bytes); scan.totalBytesScanned += ' dev-tour-launcher'.length
  r.observations.scan = scan; rewrite(directory, 'chunk-scan.json', scan); rewrite(directory, 'result.json', r)
})
check('rejects a path escaping the archived client-chunk directory', directory => { const r = structuredClone(result); r.observations.scan.chunks[0].artifact = 'client-chunks/../../.env.local'; rewrite(directory, 'chunk-scan.json', r.observations.scan); rewrite(directory, 'result.json', r) })
check('rejects unconfirmed browser descendant absence', directory => { const r = structuredClone(result); r.cleanup.records.find(c => c.name === 'chromium').remainingBrowserProcesses = [{ ProcessId: 1 }]; rewrite(directory, 'result.json', r) })
check('rejects build-log tampering', directory => writeFileSync(resolve(directory, 'build.log'), 'changed'))
check('rejects a missing execution manifest', directory => unlinkSync(resolve(directory, 'execution.json')))
check('rejects a source HEAD mismatch', directory => { const r = structuredClone(result); r.source.head = '0'.repeat(40); rewrite(directory, 'result.json', r) })
out.pass = out.cases.every(c => c.pass)
writeFileSync('.phase2-local/final-a1-reader-check.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out)); process.exitCode = out.pass ? 0 : 1
