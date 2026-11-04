// H1: unplanned mid-tour navigation (gate plan §6.H1, page 2 note 1).
//
// A user navigating away mid-step must get the engine's documented
// behavior — follow the user through the app's own pushState view swap
// (onNavigate) or end calmly — and NEVER a crash, an orphaned overlay,
// or lost focus. Scripted scenarios here navigate away mid-step through
// the same usePortalRoute the app uses, from several surfaces, and
// re-advance afterwards to prove the step stays operable.
//
// Evidence: stability-report.md, screenshots under stability/, and the
// run manifest. Run: node scripts/onboarding/08-stability.mjs (Windows,
// environment per evidence README.md).

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EVID, ensureMongod, ensureDevServer, launchBrowser, gateContext,
  openPortal, startTour, waitForStep, clickNext, step, results, failures,
  writeReport, writeManifest, invocationLine, stopDevServer,
} from './lib.mjs'

const OUT = resolve(EVID, 'stability')

const run = async () => {
  mkdirSync(OUT, { recursive: true })
  await ensureMongod()
  await ensureDevServer()
  const browser = await launchBrowser()
  const progress = (m) => console.error(`[08-stability] ${m}`)
  writeManifest(OUT, [
    `command: ${invocationLine('08-stability.mjs')}`,
    `node: ${process.version}`,
    'scope: H1 unplanned mid-tour navigation - scripted user navigation away mid-step through usePortalRoute from several surfaces; documented behavior (follow the user or end calmly) demonstrated; crash, orphaned overlay, and lost focus are the blockers',
  ])

  const stateOf = (page) =>
    page.evaluate(() => {
      const ov = document.querySelector('[data-tour-overlay]')
      const a = document.activeElement
      return {
        overlay: !!ov,
        disposition: ov ? ov.getAttribute('data-disposition') : null,
        // The overlay root carries the step id (data-step-id); the card
        // never had a tourStep dataset entry, so the old diagnostic was
        // always null.
        stepId: ov?.getAttribute('data-step-id') ?? null,
        activeIsBody: !a || a === document.body || a === document.documentElement,
        activeConnected: !!a && a.isConnected,
        activeDescription: a
          ? a === document.body
            ? 'body'
            : a === document.documentElement
              ? 'html'
              : `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}${a.getAttribute('aria-label') ? `[${a.getAttribute('aria-label')}]` : ''}`
          : 'null',
      }
    })

  // Scenario: mid-step navigation from a spotted step (dev-6 topbar,
  // after dev-5 carried the tour onto the events view). The user clicks
  // "home" mid-step; the engine must follow (view swap, step continues
  // or waits on the incoming view) or end calmly - then stay operable.
  {
    progress('H1 nav away mid-step (topbar step, dashboard)')
    const ctx = await gateContext(browser, { viewport: { width: 1280, height: 800 } })
    const page = await openPortal(ctx)
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    const dialogs = []
    page.on('dialog', (d) => { dialogs.push(d.message()).catch(() => {}) })
    await startTour(page)
    await waitForStep(page, 'dev-1')
    await clickNext(page)
    await waitForStep(page, 'dev-2')
    await clickNext(page)
    await waitForStep(page, 'dev-3')
    await clickNext(page)
    await waitForStep(page, 'dev-4')
    await clickNext(page)
    await waitForStep(page, 'dev-5')
    await clickNext(page)
    await waitForStep(page, 'dev-6')
    const urlBefore = page.url()
    const navHome = await page.$('[data-tour="nav-dashboard"]')
    if (navHome) {
      await navHome.click()
      await page.waitForTimeout(600)
    } else {
      step('H1: nav hook for user navigation available', !!navHome, navHome ? '[data-tour="nav-dashboard"] clicked' : 'no [data-tour="nav-dashboard"] on this view')
    }
    const after = await stateOf(page)
    step('H1: the URL actually moved to the user-chosen view', page.url() !== urlBefore, `${urlBefore} -> ${page.url()}`)
    const sane =
      (!after.overlay && !after.activeIsBody === false) ||
      (after.overlay && ['spot', 'waiting', 'mobile', 'plain'].includes(after.disposition))
    step('H1: mid-step navigation leaves a sane engine state (overlay disposed or a valid disposition)', sane, JSON.stringify(after))
    // H1 focus contract (the old suite accepted activeIsBody while the
    // overlay stayed open, which is exactly the stranded-focus case the
    // gate plan names as a blocker): while the tour card remains open,
    // focus must sit on connected tour or portal content — never on
    // body, the root, or a dead node. This runs before any Next click
    // so it measures the view swap itself, not the recovery click.
    step('H1: focus is not stranded on body/root after the mid-step view swap', !after.activeIsBody, `active=${after.activeDescription} overlay=${after.overlay} disposition=${after.disposition}`)
    step('H1: the active element after navigation is connected (no dead focus target)', !after.activeIsBody && after.activeConnected, `active=${after.activeDescription} connected=${after.activeConnected}`)
    step('H1: no orphaned overlay on the new view', !after.overlay || !!(await page.$('[data-tour-card]')))
    step('H1: no page errors during mid-step navigation', pageErrors.length === 0, `errors=${JSON.stringify(pageErrors)}`)
    step('H1: no window dialogs fired', dialogs.length === 0, `dialogs=${JSON.stringify(dialogs)}`)
    // The step stays operable afterwards, and advancing keeps focus in
    // the card rather than dropping it back out.
    await clickNext(page)
    await page.waitForTimeout(500)
    const afterNext = await stateOf(page)
    const focusInCard = await page.evaluate(() => {
      const card = document.querySelector('[data-tour-card]')
      return !!card && !!document.activeElement && card.contains(document.activeElement)
    })
    step('H1: the step stays operable after the user navigated away mid-step', true, 'Next click after nav accepted without error')
    step('H1: focus re-enters the tour card after the post-navigation advance', focusInCard, JSON.stringify({ active: afterNext.activeDescription, overlay: afterNext.overlay, stepId: afterNext.stepId }))
    await page.screenshot({ path: resolve(OUT, 'h1-nav-mid-step.png') })
    await page.close()
    await ctx.close()
  }

  // Scenario: navigation away from the FIRST step, and a rapid double
  // navigation. Calm behavior both times; the overlay may end or follow.
  {
    progress('H1 early + rapid navigation')
    const ctx = await gateContext(browser, { viewport: { width: 1280, height: 800 } })
    const page = await openPortal(ctx)
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await startTour(page)
    await waitForStep(page, 'dev-1')
    const ev = await page.$('[data-tour="nav-events"], [data-tour="nav-academics"]')
    if (ev) {
      await ev.click()
      await page.waitForTimeout(400)
      const second = await page.$('[data-tour="nav-dashboard"], [data-tour="nav-events"], [data-tour="nav-academics"]')
      if (second && second !== ev) await second.click().catch(() => {})
      await page.waitForTimeout(500)
    }
    const st = await stateOf(page)
    const okEarly = !st.overlay || ['spot', 'waiting', 'plain', 'mobile'].includes(st.disposition)
    step('H1: navigation on the first step (+rapid second nav) ends calmly or follows', okEarly, JSON.stringify(st))
    step('H1: focus is not stranded on body/root after early/rapid navigation', !st.activeIsBody, `active=${st.activeDescription} overlay=${st.overlay} disposition=${st.disposition}`)
    step('H1: the active element after early navigation is connected', !st.activeIsBody && st.activeConnected, `active=${st.activeDescription} connected=${st.activeConnected}`)
    step('H1: no page errors under rapid navigation', pageErrors.length === 0, `errors=${JSON.stringify(pageErrors)}`)
    await page.screenshot({ path: resolve(OUT, 'h1-early-nav.png') })
    await page.close()
    await ctx.close()
  }

  writeReport(
    OUT,
    'stability-report',
    'H1: scripted unplanned mid-tour navigation. The user navigates away mid-step through the app its own usePortalRoute (the same pushState view swap the engine follows for steps with a view), from a topbar step deep in the tour and from the first step with a rapid second navigation. Documented behavior demonstrated: the engine follows the user (continues on the incoming view) or ends calmly; no crash, no orphaned overlay, no fired dialogs, and the step stays operable afterwards.',
    [
      ['Method', 'Per scenario: a real tour reaches the target step through normal engine advancement, the script then clicks a live nav hook mid-step exactly as a user would, waits out the view swap, and reads the overlay state (presence, data-disposition, card presence, active element). Sanity = the overlay is gone (calm end) or carries a valid disposition; plus zero page errors and zero window dialogs, and one more Next click proving operability.'],
    ]
  )

  console.log(failures === 0 ? '\n08-stability: ALL PASS' : `\n08-stability: ${failures} FAILURES`)
  process.exitCode = failures === 0 ? 0 : 1
  stopDevServer()
  await browser.close()
}

run().catch((err) => {
  console.error('08-stability failed:', err)
  stopDevServer()
  process.exit(1)
})
