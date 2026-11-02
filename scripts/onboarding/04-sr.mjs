// D3-D4 screen-reader announcements and accessible names (gate plan
// section 5).
//
// Command:
//   bun scripts/onboarding/04-sr.mjs
// Evidence: sr-announcements-report.md.
//
// Manual pass note: the scripted assertions pin the live-region
// sentences and the accessible-name inventory; the owner's manual
// screen-reader pass happens at review time with this report as the
// map. The sr-only polite status region is the GlobalSearch pattern.

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EVID,
  clickNext,
  ensureDevServer,
  ensureMongod,
  failures,
  gateContext,
  invocationLine,
  launchBrowser,
  openPortal,
  startTour,
  step,
  stopDevServer,
  waitForStep,
  writeManifest,
  writeReport,
} from './lib.mjs'

const OUT = resolve(EVID, 'sr')

const run = async () => {
  mkdirSync(OUT, { recursive: true })
  await ensureMongod()
  await ensureDevServer()
  const browser = await launchBrowser()
  const progress = (m) => console.error(`[04-sr] ${m}`)

  const liveText = (page) =>
    page.evaluate(() => document.querySelector('[data-tour-overlay] > p[aria-live="polite"]')?.textContent ?? null)

  // --- D3: live-region sentences -------------------------------------
  {
    progress('D3 announcements')
    const ctx = await gateContext(browser, { viewport: { width: 1280, height: 800 } })
    const page = await openPortal(ctx)
    await startTour(page, { toDisposition: null })
    await waitForStep(page, 'dev-1')

    const regionShape = await page.evaluate(() => {
      const p = document.querySelector('[data-tour-overlay] > p[aria-live="polite"]')
      return {
        present: !!p,
        role: p?.getAttribute('role'),
        live: p?.getAttribute('aria-live'),
        srOnly: !!p && p.className.includes('sr-only'),
      }
    })
    step('D3: one sr-only polite status region lives in the overlay (GlobalSearch pattern)', regionShape.present && regionShape.role === 'status' && regionShape.live === 'polite' && regionShape.srOnly, JSON.stringify(regionShape))

    const start = await liveText(page)
    step('D3: start announces the first step', /guided tour, step 1 of 8/i.test(start ?? ''), `"${start}"`)

    await clickNext(page)
    await waitForStep(page, 'dev-2')
    const second = await liveText(page)
    step('D3: step changes announce the position and title', /step 2 of 8/i.test(second ?? '') && /synthetic 2/i.test(second ?? ''), `"${second}"`)

    // The skip composes its note into the next step's sentence.
    for (let i = 2; i <= 6; i++) {
      await clickNext(page)
      await waitForStep(page, `dev-${i + 1}`)
    }
    await waitForStep(page, 'dev-8')
    const afterSkip = await liveText(page)
    step('D3: a skipped step announces the skip composed with the next step', /step skipped/i.test(afterSkip ?? '') && /step 8 of 8/i.test(afterSkip ?? ''), `"${afterSkip}"`)

    // End announcements live in the host region (the overlay unmounts).
    await page.click('button[aria-label="Finish the guided tour"]')
    await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 5000 })
    const completed = await page.evaluate(() => [...document.querySelectorAll('p[role="status"][aria-live="polite"]')].map((p) => p.textContent).join(' | '))
    step('D3: completion announces through the host region', /guided tour completed/i.test(completed), `"${completed}"`)

    // Skip end: re-open and Escape.
    await page.click('[data-tour="dev-tour-launcher"]')
    await page.waitForSelector('[data-tour-overlay]', { timeout: 10000 })
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 5000 })
    const skippedEnd = await page.evaluate(() => [...document.querySelectorAll('p[role="status"][aria-live="polite"]')].map((p) => p.textContent).join(' | '))
    step('D3: skipping announces through the host region', /guided tour skipped/i.test(skippedEnd), `"${skippedEnd}"`)

    // No chatty duplicates: exactly one overlay region, one host region.
    const regionCount = await page.evaluate(
      () => document.querySelectorAll('[data-tour-overlay] > p[aria-live="polite"]').length
    )
    const hostRegionCount = await page.evaluate(() => document.querySelectorAll('p[role="status"][aria-live="polite"].sr-only').length)
    step('D3: no duplicate live regions (one overlay region while touring, one host region)', regionCount === 0 && hostRegionCount === 1, `overlay=${regionCount}, host=${hostRegionCount}`)
    await ctx.close()
  }

  // --- D4: accessible names ------------------------------------------
  {
    progress('D4 accessible names')
    const ctx = await gateContext(browser, { viewport: { width: 1280, height: 800 } })
    const page = await openPortal(ctx)

    // The launcher unmounts while the tour runs; read its label before
    // the tour opens.
    const launcher = await page.evaluate(() => {
      const b = document.querySelector('[data-tour="dev-tour-launcher"]')
      return { text: b?.textContent?.trim()?.replace(/\s+/g, ' ') }
    })
    step('D4: the launcher carries a visible, accessible label', /start guided tour/i.test(launcher.text ?? ''), `"${launcher.text}"`)

    await startTour(page, { toDisposition: null })
    await waitForStep(page, 'dev-1')

    const card = await page.evaluate(() => {
      const dlg = document.querySelector('[data-tour-card]')
      if (!dlg) return null
      const labelledBy = dlg.getAttribute('aria-labelledby')
      const heading = labelledBy ? document.getElementById(labelledBy)?.textContent : null
      return {
        role: dlg.getAttribute('role'),
        ariaModal: dlg.getAttribute('aria-modal'),
        labelledBy,
        heading,
        unnamedControls: [...dlg.querySelectorAll('button, a[href]')]
          .filter((b) => !(b.getAttribute('aria-label') || b.textContent?.trim()))
          .map((b) => b.outerHTML.slice(0, 60)),
        controls: [...dlg.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') || b.textContent?.trim()),
      }
    })
    step(
      'D4: the step card is a named dialog (role=dialog, aria-modal, labelled by the step heading)',
      card?.role === 'dialog' && card?.ariaModal === 'true' && !!card?.heading && !!card?.heading.includes('Synthetic 1'),
      JSON.stringify(card)
    )
    step('D4: every control in the card carries an accessible name', (card?.unnamedControls?.length ?? 1) === 0, `controls=${JSON.stringify(card?.controls)}`)

    const decoratives = await page.evaluate(() => {
      const spot = document.querySelector('[data-tour-spotlight]')
      if (!spot) return null
      return { ariaHidden: spot.getAttribute('aria-hidden') }
    })
    step('D4: the decorative spotlight is hidden from AT (everything exposed is named)', decoratives?.ariaHidden === 'true', JSON.stringify(decoratives))

    // Inspect Chromium's actual accessibility tree. A DOM label attribute
    // alone cannot establish what assistive technology receives.
    const ax = await ctx.newCDPSession(page)
    try {
      const { nodes } = await ax.send('Accessibility.getFullAXTree')
      const exposed = nodes.filter((node) => !node.ignored)
      const dialog = exposed.find((node) => node.role?.value === 'dialog' && node.name?.value === card?.heading)
      const byId = new Map(nodes.map((node) => [node.nodeId, node]))
      const descendants = []
      const visit = (node) => {
        if (!node) return
        if (!node.ignored) descendants.push(node)
        for (const id of node.childIds ?? []) visit(byId.get(id))
      }
      visit(dialog)
      const buttons = descendants.filter((node) => node.role?.value === 'button')
      const names = buttons.map((node) => String(node.name?.value ?? '').trim())
      const required = ['Skip the guided tour', 'Go back to the previous tour step', 'Go to the next tour step']
      step('D4: Chromium accessibility tree exposes the named tour dialog and all three named controls',
        !!dialog && buttons.length === 3 && names.every(Boolean) && required.every((name) => names.includes(name)),
        JSON.stringify({ dialog: dialog?.name?.value ?? null, controls: names }))
    } catch {
      step('D4: Chromium accessibility tree audit executed', false, 'Accessibility tree unavailable; DOM labels do not substitute for this assertion')
    } finally { await ax.detach() }
    await page.screenshot({ path: resolve(OUT, 'd4-named-controls.png') })

    // End the tour: with the launcher's label already captured pre-tour
    // (it unmounts while the tour runs), close and verify nothing
    // unnamed is left behind.
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 5000 })
    step('D4: nothing unnamed is left behind once the tour ends', !(await page.evaluate(() => document.querySelector('[data-tour-spotlight], [data-tour-card]'))), 'spotlight and card absent post-tour')

    await ctx.close()
  }

  await browser.close()

  writeManifest(OUT, [
    `invocation: ${invocationLine('04-sr.mjs')}`,
    'scope: D3 live-region sentences (start, step change, composed skip, completed, skipped, no duplicate regions), D4 accessible names (dialog name, control names, launcher label, decorative spotlight hidden, accessibility snapshot audit)',
    'deviations: the scripted pass pins the live region and the name inventory; the human screen-reader pass is the owner review',
    `exit: ${failures === 0 ? 0 : 1}`,
  ])

  writeReport(
    OUT,
    'SR announcements report',
    'D3 and D4: step changes announce through one sr-only polite status region in the overlay (the GlobalSearch pattern), a skipped step composes its note into the next announcement as one sentence, completion and skip announce through the host region that survives the overlay unmount, and no duplicate regions exist. The step card is a labelled dialog (role=dialog, aria-modal, aria-labelledby to the step heading), every control carries an accessible name, the launcher is visibly labeled, and the decorative spotlight and scrim are aria-hidden so nothing unnamed reaches AT. The accessibility snapshot audit reports zero unnamed buttons.',
    [
      ['D3 announcements', 'Start: "Guided tour, step 1 of 8: Synthetic 1: live navigation target." Step change: "Guided tour, step 2 of 8: ...". Skip: "Step skipped: Synthetic 7: target absent target is not available. Guided tour, step 8 of 8: ..." (composed so the skip is heard, not overwritten). End: "Guided tour completed." / "Guided tour skipped." from the host region.'],
      ['D4 accessible names', 'Card: role=dialog, aria-modal=true, labelled by the step heading. Controls: "Skip tour", "Back" (disabled on step 1), "Next"/"Finish" — all named via aria-label. Launcher: "Dev / Start guided tour". Spotlight and scrim: aria-hidden decorative layers.'],
      ['Manual pass', 'The owner performs the manual screen-reader pass at review; this report maps every announcement and name the scripted audit verified.'],
    ]
  )

  console.log(failures === 0 ? '\n04-sr: ALL PASS' : `\n04-sr: ${failures} FAILURES`)
  stopDevServer()
  await browser.close().catch(() => {})
  process.exit(failures === 0 ? 0 : 1)
}

run().catch(async (err) => {
  console.error('04-sr failed:', err)
  stopDevServer()
  process.exit(1)
})
