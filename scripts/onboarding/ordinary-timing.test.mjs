import { expect, test } from 'bun:test'
import { summarizeOrdinaryTimingRun } from './ordinary-timing.mjs'

const sample = (ms, from = 'dev-4', to = 'dev-5', run = 1) => ({ run, ms, from, to })
test('ordinary Rule 2 excludes only the two named fixtures and keeps a slow genuine route transition', () => {
  const samples = [...Array.from({ length: 20 }, () => sample(70)), sample(900), sample(800, 'dev-2', 'dev-3'), sample(1600, 'dev-6', 'dev-8')]
  const result = summarizeOrdinaryTimingRun(samples)
  expect(result.samples).toEqual(samples)
  expect(result.ordinary.advances).toBe(21)
  expect(result.ordinary.maxMs).toBe(900)
  expect(result.excluded).toHaveLength(2)
  expect(result.complete.advances).toBe(23)
})
test('ordinary Rule 2 fails slow genuine transitions and insufficient ordinary samples', () => {
  expect(summarizeOrdinaryTimingRun(Array.from({ length: 20 }, () => sample(101))).status).toBe('FAIL')
  expect(summarizeOrdinaryTimingRun(Array.from({ length: 15 }, () => sample(70))).status).toBe('FAIL')
  expect(summarizeOrdinaryTimingRun(Array.from({ length: 20 }, () => sample(100))).status).toBe('PASS')
})
test('ordinary Rule 2 rejects pooled runs and invalid samples', () => {
  expect(() => summarizeOrdinaryTimingRun([sample(10), sample(20, 'dev-4', 'dev-5', 2)])).toThrow()
  expect(() => summarizeOrdinaryTimingRun([sample(NaN)])).toThrow()
})
