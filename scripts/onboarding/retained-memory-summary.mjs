// Read-only comparison of saved V8 snapshots. Each snapshot supplies its
// own field layout. Counts of fingerprint strings are not retained sizes
// and do not, by themselves, establish ownership of growing objects.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

function summarize(file) {
  const bytes = readFileSync(file), snapshot = JSON.parse(bytes)
  const meta = snapshot.snapshot.meta, fields = meta.node_fields
  const at = name => fields.indexOf(name)
  const [type, name, size, detached] = ['type', 'name', 'self_size', 'detachedness'].map(at)
  if ([type, name, size].some(n => n < 0) || snapshot.nodes.length % fields.length) throw new Error('Unsupported snapshot layout')
  const types = {}, groups = {}, fingerprints = {}
  const exact = ['data-tour-card', 'data-tour-overlay', 'data-tour-spotlight', 'Guided tour completed.', 'OnboardingDev']
  let detachedNodes = 0
  for (let offset = 0; offset < snapshot.nodes.length; offset += fields.length) {
    const kind = meta.node_types[type][snapshot.nodes[offset + type]]
    const label = snapshot.strings[snapshot.nodes[offset + name]]
    const self = snapshot.nodes[offset + size]
    types[kind] = (types[kind] || 0) + self
    const key = JSON.stringify([kind, label])
    const group = groups[key] ||= { type: kind, name: label, count: 0, selfBytes: 0 }
    group.count++; group.selfBytes += self
    if (detached >= 0 && snapshot.nodes[offset + detached] === 2) detachedNodes++
    if (exact.includes(label)) fingerprints[key] = (fingerprints[key] || 0) + 1
  }
  return { file: resolve(file), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    types, groups, fingerprints, detachedNodes: detached < 0 ? null : detachedNodes }
}

const [baseFile, finalFile, output] = process.argv.slice(2)
if (!baseFile || !finalFile || !output) throw new Error('Usage: node retained-memory-summary.mjs BASE FINAL OUTPUT')
const base = summarize(baseFile), final = summarize(finalFile)
const changes = Object.keys({ ...base.groups, ...final.groups }).map(key => {
  const b = base.groups[key], f = final.groups[key]
  return { type: (f || b).type, name: (f || b).name,
    baseCount: b?.count || 0, finalCount: f?.count || 0,
    deltaCount: (f?.count || 0) - (b?.count || 0),
    deltaSelfBytes: (f?.selfBytes || 0) - (b?.selfBytes || 0) }
}).filter(g => g.deltaCount || g.deltaSelfBytes).sort((a, b) => b.deltaSelfBytes - a.deltaSelfBytes)
const omitGroups = ({ groups, ...rest }) => rest
const result = { schema: 'aics-saved-heap-summary/v1', capturedAt: new Date().toISOString(),
  command: process.argv.slice(1), base: omitGroups(base), final: omitGroups(final),
  typeDeltas: Object.fromEntries(Object.keys({ ...base.types, ...final.types }).map(k => [k, (final.types[k] || 0) - (base.types[k] || 0)])),
  topGrowth: changes.slice(0, 25), objectConstructorGrowth: changes.filter(g => g.type === 'object' && g.deltaCount > 0),
  limitation: 'Shallow size and constructor counts only. Fingerprint string counts do not prove object ownership or zero retained tour memory. This script does not issue a memory acceptance verdict.' }
writeFileSync(output, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ output, detached: [base.detachedNodes, final.detachedNodes], typeDeltas: result.typeDeltas }))
