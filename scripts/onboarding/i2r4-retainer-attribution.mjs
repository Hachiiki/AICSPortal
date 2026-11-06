// I2 rule 4b - focused offline retainer analysis of a saved heap snapshot
// pair (baseline + final from one i2r4-linux-attribution probe run).
//
// Purpose: attribute the generic Object/Array count remainder that the
// constructor-level aggregate leaves unexplained (the historical Windows
// remainder was +88 Objects / +27 Arrays over ten cycles), and recompute the
// type/constructor attribution with layout-driven parsing after the
// 2026-11-06 parser correction.
//
// Method (Rule 4b protocol, attribution section):
//   - Parse each snapshot with its OWN meta layout (field indices derived
//     from node_fields/edge_fields; never a fixed offset).
//   - Type-level and constructor-level self-size/count deltas.
//   - Ownership buckets for every object- and array-type node in each
//     snapshot: walk the node's retainer chains upward (breadth-first,
//     bounded depth and a per-walk visited bound) and classify by the first
//     matching marker class along the chain: tour (onboarding fingerprints),
//     testing instrumentation, React/runtime, V8 compilation machinery,
//     DOM/window, otherwise unattributed-chain-recorded. A node with no
//     incoming edges is itself a GC root (bucket 'root').
//   - Bucket multisets (count + self bytes) are diffed baseline vs final:
//     per-bucket deltas attribute the growth without requiring stable node
//     identity across snapshots.
//   - Representative retainer chains are recorded per bucket (bounded).
//
// Detached-DOM counts use the snapshot's own detachedness field.
//
// Raw snapshots stay outside the repository; this script writes its JSON
// report next to the probe result it complements. No thresholds are
// adjusted and no gate verdict is emitted.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, basename } from 'node:path'

const [baseFile, finFile, outPath] = process.argv.slice(2)
if (!baseFile || !finFile || !outPath) throw new Error('Usage: node i2r4-retainer-attribution.mjs BASELINE_SNAPSHOT FINAL_SNAPSHOT OUT_JSON')
const progress = (m) => console.error(`[i2r4-retainer] ${m}`)

const MARKERS = [
  { class: 'tour', node: ['data-tour', 'OnboardingDev', 'onboarding', 'tour-overlay', 'tour-card', 'Synthetic 1: live navigation target', 'Synthetic 2', 'Synthetic 3', 'Synthetic 4', 'Synthetic 5', 'Synthetic 6', 'Synthetic 7', 'Synthetic 8', 'Guided tour completed.', 'TourOverlay'], edge: ['data-tour', 'onboarding'] },
  { class: 'instrumentation', node: ['playwright', '__pw', 'CDP', 'injectedScript', 'InjectedScript', '__ember', 'puppeteer'], edge: ['__playwright', 'pw'] },
  { class: 'v8-compilation', node: ['InstructionStream', 'FeedbackVector', 'SharedFunctionInfo', 'system / Script', 'system / Code', 'system / Context', 'system / Construction count', 'Boilerplate', 'CompilationCache', 'system / TrustedByteArray', 'system / FixedArray (boilerplate)', 'Script'], edge: [] },
  { class: 'react-runtime', node: ['FiberNode', 'react', 'React', '__SECRET_INTERNALS', 'react-dom', 'SuspenseComponent', 'HostRoot', 'FiberRootNode'], edge: ['__reactFiber', '__reactContainer', 'reactFiber', 'reactContainer', 'stateNode', 'return', 'alternate', 'updateQueue'] },
  { class: 'dom-window', node: ['HTMLDocument', 'Window', 'Document', 'global', 'HTMLBodyElement', 'HTMLHtmlElement', 'Detached'], edge: [] },
]

const classifyMarker = (text) => {
  const low = text.toLowerCase()
  for (const m of MARKERS) {
    for (const p of [...m.node, ...m.edge]) if (low.includes(p.toLowerCase())) return m.class
  }
  return null
}

function parseSnapshot(file) {
  progress(`parsing ${basename(file)}`)
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  const meta = raw.snapshot.meta
  const FIELD = Object.fromEntries(meta.node_fields.map((f, i) => [f, i]))
  const EFIELD = Object.fromEntries(meta.edge_fields.map((f, i) => [f, i]))
  const stride = meta.node_fields.length
  const eStride = meta.edge_fields.length
  const typeNames = meta.node_types[0]
  const edgeTypes = meta.edge_types[0]
  const count = raw.snapshot.node_count
  const nodes = raw.nodes, edges = raw.edges, strings = raw.strings
  const iType = FIELD.type, iName = FIELD.name, iSelf = FIELD.self_size, iEc = FIELD.edge_count, iDet = FIELD.detachedness
  const eName = EFIELD.name_or_index, eTo = EFIELD.to_node

  const nodeType = new Uint8Array(count)
  const nodeName = new Int32Array(count)
  const selfSize = new Float64Array(count)
  const edgeCount = new Int32Array(count)
  let detachedCount = 0
  for (let i = 0; i < count; i++) {
    const b = i * stride
    nodeType[i] = nodes[b + iType]
    nodeName[i] = nodes[b + iName]
    selfSize[i] = nodes[b + iSelf]
    edgeCount[i] = nodes[b + iEc]
    if (iDet !== undefined && nodes[b + iDet] === 2) detachedCount++
  }
  // CSR incoming-edge index: retainers of every node.
  let edgeTotal = 0
  for (let i = 0; i < count; i++) edgeTotal += edgeCount[i]
  const incOffset = new Int32Array(count + 1)
  for (let i = 0; i < count; i++) incOffset[i + 1] = incOffset[i] + edgeCount[i]
  const incFrom = new Int32Array(edgeTotal)
  const incEdgeName = new Int32Array(edgeTotal)
  const incEdgeType = new Uint8Array(edgeTotal)
  const fill = incOffset.slice(0, count)
  let eb = 0
  for (let i = 0; i < count; i++) {
    const ec = edgeCount[i]
    for (let e = 0; e < ec; e++) {
      const to = edges[eb + eTo] / stride
      const slot = fill[to]++
      incFrom[slot] = i
      incEdgeName[slot] = edges[eb + eName]
      incEdgeType[slot] = edges[eb]
      eb += eStride
    }
  }
  progress(`${count} nodes, ${edgeTotal} edges indexed`)
  return { raw, meta, stride, eStride, typeNames, edgeTypes, count, nodes, edges, strings, nodeType, nodeName, selfSize, edgeCount, incOffset, incFrom, incEdgeName, incEdgeType, detachedCount, iName, iType }
}

const typeName = (s, i) => s.typeNames[i]
const nameOf = (s, i) => {
  const t = typeName(s, s.nodeType[i])
  if (t === 'object' || t === 'closure' || t === 'hidden') {
    const n = s.strings[s.nodeName[i]]
    return n || t
  }
  if (t === 'string' || t === 'concatenated string' || t === 'sliced string') {
    const v = s.strings[s.nodeName[i]]
    return v && v.length ? `"${v.slice(0, 28)}"` : t
  }
  return t
}
const edgeNameOf = (s, slot) => {
  const t = s.edgeTypes[s.incEdgeType[slot]]
  if (t === 'element' || t === 'hidden') return `[${t}]`
  const n = s.strings[s.incEdgeName[slot]]
  return n !== undefined && n !== '' ? n : t
}

// Bounded upward walk: return the first marker class reachable within
// depth/visited bounds, plus a representative chain for the record.
function walkClassify(s, start, depthLimit = 10, visitedCap = 4000) {
  const seen = new Set([start])
  let frontier = [{ node: start, chain: [] }]
  let visited = 1
  for (let d = 0; d < depthLimit && frontier.length; d++) {
    const next = []
    for (const { node, chain } of frontier) {
      const lo = chain.length ? 0 : 0
      void lo
      const from0 = s.incOffset[node], to0 = s.incOffset[node + 1]
      if (from0 === to0 && chain.length === 0) return { class: 'root', chain: [{ node: nameOf(s, node), via: '(no retainers)' }] }
      for (let slot = from0; slot < to0; slot++) {
        const ret = s.incFrom[slot]
        if (seen.has(ret)) continue
        seen.add(ret)
        if (++visited > visitedCap) return { class: null, chain: chain.length ? chain : [{ node: nameOf(s, node), via: '(visited cap)' }] }
        const via = edgeNameOf(s, slot)
        const name = nameOf(s, ret)
        const step = { node: name, via }
        const hit = classifyMarker(`${name} ${via}`)
        if (hit) return { class: hit, chain: [...chain, step] }
        next.push({ node: ret, chain: [...chain, step].slice(-6) })
        if (next.length > 400) break
      }
      if (next.length > 400) break
    }
    frontier = next
  }
  return { class: null, chain: frontier.length && frontier[0].chain.length ? frontier[0].chain : [{ node: nameOf(s, start), via: '(depth cap)' }] }
}

function analyze(file, label) {
  const s = parseSnapshot(file)
  const byType = {}
  const ctor = new Map()
  const buckets = new Map()
  const bucketChains = new Map()
  let classified = 0
  for (let i = 0; i < s.count; i++) {
    const t = typeName(s, s.nodeType[i])
    byType[t] = (byType[t] || 0) + s.selfSize[i]
    const isObj = t === 'object', isArr = t === 'array'
    if (isObj) {
      const name = s.strings[s.nodeName[i]] || t
      const e = ctor.get(name) || { count: 0, self: 0 }
      e.count++; e.self += s.selfSize[i]
      ctor.set(name, e)
    }
    if (isObj || isArr) {
      const { class: cls, chain } = walkClassify(s, i)
      const key = `${isArr ? 'array' : 'object'}|${cls ?? 'unattributed'}`
      const b = buckets.get(key) || { count: 0, self: 0 }
      b.count++; b.self += s.selfSize[i]
      buckets.set(key, b)
      if (cls) classified++
      if ((cls === 'tour' || cls === 'instrumentation' || (cls === null && (isArr || (s.strings[s.nodeName[i]] === 'Object')))) && !bucketChains.has(key)) {
        bucketChains.set(key, { representative: chain.slice(0, 8), instance: nameOf(s, i) })
      }
    }
  }
  progress(`${label}: ${classified} object/array nodes classified`)
  return { label, byType, ctor, buckets, bucketChains, detachedCount: s.detachedCount, count: s.count, strings: s.strings.length }
}

const base = analyze(baseFile, 'baseline')
const fin = analyze(finFile, 'final')

const typeDelta = {}
for (const t of new Set([...Object.keys(base.byType), ...Object.keys(fin.byType)])) typeDelta[t] = fin.byType[t] - base.byType[t]
const ctorDelta = []
for (const name of new Set([...base.ctor.keys(), ...fin.ctor.keys()])) {
  const b = base.ctor.get(name) || { count: 0, self: 0 }
  const f = fin.ctor.get(name) || { count: 0, self: 0 }
  if (f.count - b.count !== 0 || f.self - b.self !== 0) ctorDelta.push({ name, baseCount: b.count, finalCount: f.count, deltaCount: f.count - b.count, baseSelfKB: Math.round(b.self / 1024), finalSelfKB: Math.round(f.self / 1024), deltaSelfKB: Math.round((f.self - b.self) / 1024) })
}
ctorDelta.sort((a, b) => Math.abs(b.deltaSelfKB) - Math.abs(a.deltaSelfKB))
const bucketDelta = []
for (const key of new Set([...base.buckets.keys(), ...fin.buckets.keys()])) {
  const b = base.buckets.get(key) || { count: 0, self: 0 }
  const f = fin.buckets.get(key) || { count: 0, self: 0 }
  bucketDelta.push({ key, baseCount: b.count, finalCount: f.count, deltaCount: f.count - b.count, deltaSelfKB: Math.round((f.self - b.self) / 1024), representativeChain: fin.bucketChains.get(key)?.representative || base.bucketChains.get(key)?.representative || null })
}
bucketDelta.sort((a, b) => b.deltaCount - a.deltaCount)

const objectDelta = bucketDelta.filter((r) => r.key.startsWith('object|'))
const arrayDelta = bucketDelta.filter((r) => r.key.startsWith('array|'))
const genericObject = ctorDelta.filter((r) => r.name === 'Object')[0] || null
const genericArraysAsObjects = null

const result = {
  schema: 'aics-i2r4-retainer-attribution/v1',
  generatedAt: new Date().toISOString(),
  inputs: { baseline: baseFile, final: finFile },
  method: {
    parsing: 'field indices derived from each snapshot meta (node_fields/edge_fields); self_size and name never read from fixed offsets',
    ownership: 'every object- and array-type node is classified by a bounded upward retainer walk (depth 10, visited cap 4000, chain cap 6 steps recorded); first marker class along the chain wins; marker order tour > instrumentation > v8-compilation > react-runtime > dom-window',
    identity: 'no cross-snapshot node identity is assumed; growth is attributed by diffing retainer-class bucket multisets, with representative chains recorded per bucket',
  },
  typeSelfSizeDeltaBytes: typeDelta,
  detachedObjectNodes: { baseline: base.detachedCount, final: fin.detachedCount },
  objectConstructorDeltas: ctorDelta.slice(0, 60),
  genericObjectCtorDelta: genericObject,
  objectOwnershipBuckets: objectDelta,
  arrayOwnershipBuckets: arrayDelta,
  counts: { baselineNodes: base.count, finalNodes: fin.count },
}
mkdirsFor(outPath)
writeFileSync(outPath, JSON.stringify(result, null, 2))
progress(`written ${outPath}`)

function mkdirsFor(p) {
  const d = resolve(p, '..')
  import('node:fs').then((fs) => fs.mkdirSync(d, { recursive: true }))
}

console.log(JSON.stringify({
  genericObjectCtorDelta: result.genericObjectCtorDelta,
  objectOwnershipBuckets: objectDelta.map((r) => ({ key: r.key, deltaCount: r.deltaCount, deltaSelfKB: r.deltaSelfKB, chain: r.representativeChain?.slice(0, 4) })),
  arrayOwnershipBuckets: arrayDelta.map((r) => ({ key: r.key, deltaCount: r.deltaCount, deltaSelfKB: r.deltaSelfKB, chain: r.representativeChain?.slice(0, 4) })),
  detachedObjectNodes: result.detachedObjectNodes,
  topTypeDeltas: Object.fromEntries(Object.entries(typeDelta).filter(([k]) => ['code', 'object', 'closure', 'string', 'array', 'object shape', 'synthetic'].includes(k)).map(([k, v]) => [k, Math.round(v / 1024)])),
}, null, 1))
