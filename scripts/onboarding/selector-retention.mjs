// Regression at the public startTour seam. Waiting for an overlay must not
// retain each removed DOM subtree through an unused remote ElementHandle.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { launchOwnedBrowser, cleanupOwned } from './10-perf.mjs'
import { startTour } from './lib.mjs'
const out = resolve(process.env.SELECTOR_EVID || '.phase2-local/selector-retention')
if (existsSync(out)) throw new Error('Fresh evidence directory required')
mkdirSync(out, { recursive: true })
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const result = { startedAt: new Date().toISOString(), helperSHA256: hash(resolve(import.meta.dirname, 'lib.mjs')) }
try {
  const browser = await launchOwnedBrowser('selector-regression', out)
  const ctx = await browser.newContext(), page = await ctx.newPage()
  await page.setContent('<button data-tour="dev-tour-launcher">Start</button>')
  await page.evaluate(() => {
    document.querySelector('button').onclick = () => {
      const overlay = document.createElement('div')
      overlay.setAttribute('data-tour-overlay', '')
      overlay.dataset.disposition = 'spot'
      overlay.innerHTML = '<div data-tour-card><button>Skip</button><button>Back</button><button>Finish</button></div>'
      document.body.append(overlay)
    }
  })
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Performance.enable')
  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    const { metrics } = await cdp.send('Performance.getMetrics')
    return Object.fromEntries(metrics.filter(m => ['Nodes', 'JSEventListeners'].includes(m.name)).map(m => [m.name, m.value]))
  }
  const cycle = async () => {
    await startTour(page)
    await page.evaluate(() => document.querySelector('[data-tour-overlay]').remove())
  }
  await cycle()
  result.baseline = await sample()
  for (let n = 0; n < 10; n++) await cycle()
  result.final = await sample()
  result.noNodeGrowth = result.final.Nodes <= result.baseline.Nodes
  if (!result.noNodeGrowth) throw new Error('startTour retained removed overlay nodes')
  await ctx.close()
} catch (error) { result.error = error.message }
finally {
  result.cleanup = await cleanupOwned('selector-regression')
  result.helperUnchanged = result.helperSHA256 === hash(resolve(import.meta.dirname, 'lib.mjs'))
  result.exitCode = result.error || !result.noNodeGrowth || !result.helperUnchanged || result.cleanup.errors.length ? 1 : 0
  result.finishedAt = new Date().toISOString()
  writeFileSync(resolve(out, 'result.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result)); process.exitCode = result.exitCode
}
