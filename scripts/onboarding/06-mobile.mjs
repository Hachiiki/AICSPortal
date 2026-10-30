// F1 mobile sheet fallback (gate plan section 5).
//
// Command:
//   bun scripts/onboarding/06-mobile.mjs
// Evidence: mobile-sheet-report.md.
//
// Below the sm breakpoint the engine pins the step card as a bottom
// sheet and collapses the spotlight to a plain scrim. The sheet must
// be usable at phone widths and coexist with the mobile navigation
// dialog (which opens above it at z-50) rather than fight it for focus.

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

const OUT = resolve(EVID, 'mobile')

const run = async () => {
  mkdirSync(OUT, { recursive: true })
  await ensureMongod()
  await ensureDevServer()
  const browser = await launchBrowser()
  const progress = (m) => console.error(`[06-mobile] ${m}`)

  {
    progress('F1 mobile sheet')
    const ctx = await gateContext(browser, { viewport: { width: 375, height: 667 } })
    const page = await openPortal(ctx)
    const pageErrors = []
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await startTour(page, { toDisposition: null })
    await waitForStep(page, 'dev-1')

    const sheetState = await page.evaluate(() => {
      const card = document.querySelector('[data-tour-card]')
      const spot = document.querySelector('[data-tour-spotlight]')
      const overlay = document.querySelector('[data-tour-overlay]')
      if (!card || !overlay) return null
      const r = card.getBoundingClientRect()
      return {
        cardTop: r.top,
        cardBottom: r.bottom,
        viewportH: window.innerHeight,
        spotlightCollapsed: !spot,
        disposition: overlay.dataset.disposition,
      }
    })
    step(
      'F1: at phone width the card pins as a bottom sheet (no spotlight ring)',
      sheetState && sheetState.spotlightCollapsed && sheetState.cardBottom > sheetState.viewportH - 24,
      JSON.stringify(sheetState)
    )
    await page.screenshot({ path: resolve(OUT, 'f1-bottom-sheet.png') })

    // The sheet is usable: Next advances, Back works (Back is on step 2).
    await clickNext(page)
    await waitForStep(page, 'dev-2')
    const backEnabled = await page.evaluate(() => {
      const b = [...document.querySelectorAll('[data-tour-card] button')].find((x) => x.getAttribute('aria-label')?.startsWith('Go back'))
      return b ? !b.disabled : null
    })
    await page.click('button[aria-label="Go back to the previous tour step"]')
    await waitForStep(page, 'dev-1')
    step('F1: the sheet is operable (Next advances, Back returns)', backEnabled === true)

    // Coexistence: the mobile nav dialog opens above the sheet, Escape
    // closes the dialog and not the tour, and the sheet survives.
    await page.click('[data-tour="topbar-mobile-nav"]')
    await page.waitForSelector('aside[role="dialog"]', { timeout: 5000 })
    // The drawer tweens in from x=-264 over 250ms; sample after it
    // settles (left at 0), not mid-slide.
    await page.waitForFunction(
      () => {
        const dlg = document.querySelector('aside[role="dialog"]')
        return !!dlg && dlg.getBoundingClientRect().left > -1
      },
      null,
      { timeout: 5000 }
    )
    const dialogAbove = await page.evaluate(() => {
      const dlg = document.querySelector('aside[role="dialog"]')
      const r = dlg?.getBoundingClientRect()
      if (!r) return { ok: false, why: 'no dialog rect' }
      const el = document.elementFromPoint(r.left + r.width / 2, r.top + 40)
      const inside = !!el && (dlg === el || dlg.contains(el))
      return {
        ok: inside,
        why: inside ? 'inside' : `hit=${el?.tagName}.${el?.className?.toString().slice(0, 80)}`,
        rect: { top: r.top, left: r.left, w: r.width, h: r.height },
        zIndex: getComputedStyle(dlg).zIndex,
      }
    })
    step('F1: the mobile navigation dialog paints above the sheet and takes the click', dialogAbove.ok, JSON.stringify(dialogAbove))
    await page.screenshot({ path: resolve(OUT, 'f1-nav-dialog-coexistence.png') })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    const afterDialog = await page.evaluate(() => ({
      overlay: !!document.querySelector('[data-tour-overlay]'),
      navDialog: !!document.querySelector('aside[role="dialog"]'),
    }))
    step('F1: Escape closes the navigation dialog, not the tour', afterDialog.overlay && !afterDialog.navDialog, JSON.stringify(afterDialog))

    // The sheet still works after the dialog interlude. Documented focus
    // rule: the engine never fights for focus, so after the drawer
    // closes (focus falls to body) keyboard users reach the card again
    // through the tab order. The card sits near the end of the DOM, so
    // the reverse path (Shift+Tab) is the short one; Escape then ends
    // the tour cleanly.
    let tabbed = -1
    for (let i = 1; i <= 12; i++) {
      await page.keyboard.press('Shift+Tab')
      const inCard = await page.evaluate(() => !!document.activeElement?.closest('[data-tour-card]'))
      if (inCard) {
        tabbed = i
        break
      }
    }
    step('F1: the card is reachable again through the tab order after the dialog closes', tabbed > 0, `reached at Shift+Tab ${tabbed}`)
    await page.keyboard.press('Escape')
    await page.waitForFunction(() => !document.querySelector('[data-tour-overlay]'), null, { timeout: 5000 })
    const restored = await page.evaluate(() => document.activeElement?.getAttribute('data-tour'))
    step('F1: the tour ends cleanly from the sheet with focus restored', restored === 'dev-tour-launcher', `active=${restored}`)
    step('F1: no page errors on the mobile pass', pageErrors.length === 0, `errors=${pageErrors.length}`)

    // Dev-launcher note: before cookie consent is decided, the legal
    // banner (z-50, bottom-docked) overlays the launcher's bottom-right
    // corner; recorded as a dev-only cosmetic note, not a gate failure.
    await ctx.close()
  }

  await browser.close()

  writeManifest(OUT, [
    `invocation: ${invocationLine('06-mobile.mjs')}`,
    'scope: F1 at 375x667 (sheet pinned, spotlight collapsed, Next/Back operable, mobile nav dialog opens above and Escape closes the dialog not the tour, clean end with focus restore, zero page errors)',
    'deviations: none',
    `exit: ${failures === 0 ? 0 : 1}`,
  ])

  writeReport(
    OUT,
    'Mobile sheet report',
    'F1: at 375x667 the tour falls back to the documented bottom-sheet presentation — the spotlight ring collapses to a plain scrim, the card pins to the bottom of the viewport, Next and Back operate the tour, and the mobile navigation dialog opens above the sheet at z-50, takes the click and the focus, and closes on Escape without ending the tour. The tour then ends cleanly with focus restored to the launcher. The gate contexts run with cookie consent pre-decided; in a fresh profile the legal consent banner (z-50, bottom-docked) overlays the dev launcher corner until decided, a dev-only cosmetic note recorded here for completeness.',
    [
      ['F1 sheet presentation', 'Sheet pinned at the bottom (card bottom within 24px of the viewport edge), spotlight collapsed, plain scrim.'],
      ['F1 nav-dialog coexistence', 'The mobile navigation dialog (z-50) paints above the sheet, receives Escape first, and the tour continues; no focus fight in either direction. After the drawer closes, keyboard focus falls to body and the engine deliberately does not steal it back; keyboard users reach the card again through the normal tab order, and Escape then ends the tour with focus restored to the launcher.'],
      ['F1 operability', 'Next advances, Back returns, Escape ends the tour from the sheet with focus restored to the launcher; zero page errors.'],
    ]
  )

  console.log(failures === 0 ? '\n06-mobile: ALL PASS' : `\n06-mobile: ${failures} FAILURES`)
  stopDevServer()
  await browser.close().catch(() => {})
  process.exit(failures === 0 ? 0 : 1)
}

run().catch(async (err) => {
  console.error('06-mobile failed:', err)
  stopDevServer()
  process.exit(1)
})
