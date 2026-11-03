// In-page timing must observe a new, resolved step. A missing spotlight or a
// stable rectangle from the previous step is not evidence of settling.
export async function measureAdvance(page, { completionTarget = 'dev-tour-launcher' } = {}) {
  if (!/^[A-Za-z0-9_-]+$/.test(completionTarget)) throw new Error('Invalid completion target')
  return page.evaluate(async ({ completionTarget = 'dev-tour-launcher' } = {}) => {
    const previous = document.querySelector('[data-tour-overlay]')?.dataset.stepId
    const button = document.querySelector('button[aria-label="Go to the next tour step"], button[aria-label="Finish the guided tour"]')
    if (!previous || !button) throw new Error('No active tour step/control')
    const finish = button.getAttribute('aria-label') === 'Finish the guided tour'
    const start = performance.now()
    button.click()
    return new Promise((resolve, reject) => {
      let last = null, stable = 0
      const tick = () => {
        if (performance.now() - start > 20000) return reject(new Error('Step never settled'))
        const overlay = document.querySelector('[data-tour-overlay]')
        if (finish && !overlay && document.querySelector(`[data-tour="${completionTarget}"]`)) {
          return resolve({ from: previous, to: 'completed', ms: performance.now() - start })
        }
        const spot = document.querySelector('[data-tour-spotlight]')
        const rect = spot?.getBoundingClientRect()
        if (overlay?.dataset.stepId !== previous && overlay?.dataset.disposition === 'spot' && rect?.width > 0 && rect.height > 0) {
          const current = [overlay.dataset.stepId, rect.top, rect.left, rect.width, rect.height].join(',')
          stable = current === last ? stable + 1 : 0
          last = current
          if (stable >= 2) return resolve({ from: previous, to: overlay.dataset.stepId, ms: performance.now() - start })
        } else { last = null; stable = 0 }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }, { completionTarget })
}

export async function measurePerformance(browser, lib) {
  const runs = []
  for (let run = 1; run <= 3; run++) {
    const ctx = await lib.gateContext(browser, { reducedMotion: 'reduce' })
    const page = await lib.openPortal(ctx)
    const cycles = []
    // One complete warm-up discarded per context, followed by 21 advances.
    for (let cycle = 0; cycle <= 3; cycle++) {
      await lib.startTour(page)
      const samples = []
      for (let n = 0; n < 7; n++) {
        samples.push(await measureAdvance(page))
        await page.waitForTimeout(200)
      }
      if (samples.at(-1).to !== 'completed') throw new Error('Incomplete performance tour')
      cycles.push({ discardedWarmup: cycle === 0, samples })
    }
    const values = cycles.slice(1).flatMap(c => c.samples.map(s => s.ms)).sort((a, b) => a - b)
    runs.push({ run, cycles, n: values.length, p95: values[Math.ceil(values.length * .95) - 1] })
    await ctx.close()
  }
  const ctx = await lib.gateContext(browser, { reducedMotion: 'reduce' })
  const page = await lib.openPortal(ctx)
  await lib.startTour(page)
  const supported = await page.evaluate(() => {
    if (!PerformanceObserver.supportedEntryTypes.includes('longtask')) return false
    window.__phase2Longtasks = []
    window.__phase2Observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) window.__phase2Longtasks.push({ duration: entry.duration, startTime: entry.startTime,
        attribution: entry.attribution.map(a => ({ name: a.name, containerType: a.containerType })) })
    })
    window.__phase2Observer.observe({ type: 'longtask', buffered: false })
    return true
  })
  for (const width of [1100, 1024, 900, 800, 700, 800, 1024, 1280]) { await page.setViewportSize({ width, height: 700 }); await page.waitForTimeout(120) }
  for (const delta of [400, -400]) for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, delta); await page.waitForTimeout(80) }
  await page.waitForTimeout(400)
  const tasks = await page.evaluate(() => { window.__phase2Observer?.disconnect(); return window.__phase2Longtasks || [] })
  await ctx.close()
  return { runs, rule2: { provisionalLimitMs: 100, status: runs.every(r => r.n >= 20 && r.p95 <= 100) ? 'PASS' : 'FAIL',
    scope: 'Click to actual new spotlight settled, including intentional delayed-target and auto-skip waits. No exclusions beyond the disclosed complete warm-up cycle.' },
    rule3: { status: !supported || tasks.some(t => t.duration > 50) ? 'INCONCLUSIVE' : 'PASS', supported, tasks,
      limitation: 'Long Tasks API does not identify tour handler ownership. Nonzero tasks require tracing before attribution.' } }
}
