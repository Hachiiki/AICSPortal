import { test, expect } from 'bun:test'
import { measureAdvance, summarizeTimingRun } from './settle-timing.mjs'

test('an absent spotlight cannot settle before the new target appears', async () => {
  const previousDocument = globalThis.document
  const previousFrame = globalThis.requestAnimationFrame
  let clickedAt = null
  const overlay = { dataset: { stepId: 'old', disposition: 'spot' } }
  const button = { getAttribute: () => 'Go to the next tour step', click: () => { clickedAt = performance.now() } }
  globalThis.requestAnimationFrame = callback => setTimeout(callback, 5)
  globalThis.document = { querySelector(selector) {
    const ready = clickedAt !== null && performance.now() - clickedAt >= 80
    if (clickedAt !== null) overlay.dataset = { stepId: 'new', disposition: ready ? 'spot' : 'waiting' }
    if (selector === '[data-tour-overlay]') return overlay
    if (selector.startsWith('button')) return button
    if (selector === '[data-tour-spotlight]') return ready ? { getBoundingClientRect: () => ({ top: 20, left: 20, width: 100, height: 30 }) } : null
    return null
  } }
  try {
    const sample = await measureAdvance({ evaluate: callback => callback() })
    expect(sample.from).toBe('old')
    expect(sample.to).toBe('new')
    expect(sample.ms).toBeGreaterThanOrEqual(80)
  } finally {
    globalThis.document = previousDocument
    globalThis.requestAnimationFrame = previousFrame
  }
})

test('Finish settles against the real host replay entry without a synthetic launcher', async () => {
  const previousDocument = globalThis.document, previousFrame = globalThis.requestAnimationFrame, previousPerformance = globalThis.performance
  let finished = false, time = 0
  globalThis.performance = { now: () => time }
  globalThis.requestAnimationFrame = callback => setTimeout(() => { time += 1000; callback() }, 0)
  const button = { getAttribute: () => 'Finish the guided tour', click: () => { finished = true } }
  globalThis.document = { querySelector(selector) {
    if (selector === '[data-tour-overlay]') return finished ? null : { dataset: { stepId: 'student-help', disposition: 'spot' } }
    if (selector.startsWith('button')) return button
    if (selector === '[data-tour="student-tour-replay"]') return finished ? {} : null
    return null
  } }
  try {
    const sample = await measureAdvance({ evaluate: (callback, args) => callback(args) }, { completionTarget: 'student-tour-replay' })
    expect(sample.from).toBe('student-help')
    expect(sample.to).toBe('completed')
  } finally {
    globalThis.document = previousDocument; globalThis.requestAnimationFrame = previousFrame; globalThis.performance = previousPerformance
  }
})

// One run's 21 Rule 2 samples with the i2r3 fixture profile: 15 sub-limit
// advances, 3 late-mount waits and 3 absent-target budget waits, matching
// the real per-run composition (one of each per measured tour, three tours).
function makeRun(run, fastStart, late, budget) {
  const samples = []
  for (let i = 0; i < 15; i++) samples.push({ run, advance: i + 1, from: 'fixture', to: 'fixture', ms: fastStart + 2 * i })
  for (let i = 0; i < 3; i++) samples.push({ run, advance: 16 + i, from: 'fixture', to: 'fixture', ms: late[i] })
  for (let i = 0; i < 3; i++) samples.push({ run, advance: 19 + i, from: 'fixture', to: 'fixture', ms: budget[i] })
  return samples
}

test('Rule 2 summary comes from each run own samples, never a cross-run pool', () => {
  const run1 = makeRun(1, 20, [800, 810, 820], [1648.1, 1648.3, 1648.5])
  const run2 = makeRun(2, 60, [900, 910, 920], [1648.7, 1648.9, 1649.1])
  const s1 = summarizeTimingRun(run1)
  const s2 = summarizeTimingRun(run2)
  expect(s1.advances).toBe(21)
  expect(s1.medianMs).toBe(40)
  expect(s1.p95Ms).toBe(1648.3)
  expect(s1.maxMs).toBe(1648.5)
  expect(s2.advances).toBe(21)
  expect(s2.medianMs).toBe(80)
  expect(s2.p95Ms).toBe(1648.9)
  expect(s2.maxMs).toBe(1649.1)
  expect(s2.draftLimitMs).toBe(100)
})

test('pooling runs reproduces the pre-fix i2r3 aggregation defect', () => {
  const run1 = makeRun(1, 20, [800, 810, 820], [1648.1, 1648.3, 1648.5])
  const run2 = makeRun(2, 60, [900, 910, 920], [1648.7, 1648.9, 1649.1])
  const pooled = summarizeTimingRun([...run1, ...run2])
  // The first Linux run accumulated `times` across runs like this: run 2
  // recorded 42 advances and its median shifted onto run 2's fast samples
  // pulled by run 1's lighter ones. The per-run summary must never see a
  // pooled input, so these pooled numbers differ from run 2's own.
  expect(pooled.advances).toBe(42)
  expect(pooled.advances).not.toBe(summarizeTimingRun(run2).advances)
  expect(pooled.medianMs).toBe(72)
  expect(pooled.medianMs).not.toBe(summarizeTimingRun(run2).medianMs)
})

test('p95 index convention holds at the boundary sizes Rule 2 specifies', () => {
  const twenty = Array.from({ length: 20 }, (_, i) => ({ ms: i + 1 }))
  expect(summarizeTimingRun(twenty).advances).toBe(20)
  expect(summarizeTimingRun(twenty).p95Ms).toBe(19)
  expect(summarizeTimingRun([{ ms: 42 }]).p95Ms).toBe(42)
  expect(summarizeTimingRun([{ ms: 1 }, { ms: 2 }]).p95Ms).toBe(2)
  expect(summarizeTimingRun([], { draftLimitMs: 100 })).toEqual({ advances: 0, p95Ms: null, maxMs: null, medianMs: null, draftLimitMs: 100 })
})
