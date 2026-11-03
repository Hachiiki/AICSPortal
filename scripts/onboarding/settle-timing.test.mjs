import { test, expect } from 'bun:test'
import { measureAdvance } from './settle-timing.mjs'

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
