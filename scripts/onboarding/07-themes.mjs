// G1: the seven theme choices, exactly as the source defines them
// (docs/onboarding-phase2-gate-plan.md section 5.G1):
//   Light; Dark; Midnight, Slate, and OLED Black in dark mode with their
//   data-palette attribute; Custom on explicit Light AND explicit Dark
//   (from a saved aics_custom_theme); System resolved light and resolved
//   dark with the palette attribute stripped.
// The tour must stay readable in every combination: the card's own text
// rides the theme's surface/ink tokens (contrast-checked against the
// computed colors of the live card), the scrim stays visible, and the
// spotlight keeps framing. Next and Finish must also meet 4.5:1 in their
// normal and hovered states, including the saved custom theme.
//
// Evidence: theme-matrix.md, screenshots under theme/screenshots/, and
// the run manifest. Run: node scripts/onboarding/07-themes.mjs (Windows)
// following the environment procedure in evidence README.md.

import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { EVID, ensureMongod, ensureDevServer, launchBrowser, gateContext, openPortal, startTour, settledState, waitForStep, clickNext, step, failures, writeReport, writeManifest, invocationLine, stopDevServer } from './lib.mjs'
import { DEFAULT_CUSTOM_COLORS, customThemeToVars } from '../../src/lib/aics/theme-palette.ts'

const OUT = resolve(EVID, 'theme')
const SHOTS = resolve(OUT, 'screenshots')

// The saved custom theme content the gate writes (device-local storage,
// exactly what the Custom editor saves). Colors are the app's own Custom
// seed defaults. The seed accent previously made tour actions fail contrast;
// keep this fixture to detect regressions in the rendered controls.
const CUSTOM = {
  base: 'dark',
  colors: DEFAULT_CUSTOM_COLORS,
  vars: customThemeToVars(DEFAULT_CUSTOM_COLORS),
}

// rows: id, aics_theme storage value, aics_palette value, expected html
// class token (dark on dark rows), expected data-palette attribute,
// Playwright colorScheme (drives System resolution).
const rows = [
  { id: 'light', theme: 'light', palette: null, dark: false, paletteAttr: null, colorScheme: 'light' },
  { id: 'dark', theme: 'dark', palette: 'dark', dark: true, paletteAttr: null, colorScheme: 'light' },
  { id: 'midnight', theme: 'dark', palette: 'midnight', dark: true, paletteAttr: 'midnight', colorScheme: 'light' },
  { id: 'slate', theme: 'dark', palette: 'slate', dark: true, paletteAttr: 'slate', colorScheme: 'light' },
  { id: 'oled', theme: 'dark', palette: 'oled', dark: true, paletteAttr: 'oled', colorScheme: 'light' },
  { id: 'custom-light', theme: 'light', palette: 'custom', dark: false, paletteAttr: 'custom', colorScheme: 'light' },
  { id: 'custom-dark', theme: 'dark', palette: 'custom', dark: true, paletteAttr: 'custom', colorScheme: 'light' },
  { id: 'system-light', theme: 'system', palette: 'dark', dark: false, paletteAttr: null, colorScheme: 'light' },
  { id: 'system-dark', theme: 'system', palette: 'dark', dark: true, paletteAttr: null, colorScheme: 'dark' },
]

const read = async (page) =>
  page.evaluate(() => {
    const html = document.documentElement
    // Tailwind 4 tokens serialize as lab()/oklch() in computed styles; instead
    // of re-implementing color-space math, rasterize each computed color onto
    // a 1x1 canvas and read the device sRGB pixels — the browser's own
    // pipeline is the authority. Opaque colors only (double fill compositing
    // for safety); every sampled surface is fully opaque.
    const cv = document.createElement('canvas')
    cv.width = 1
    cv.height = 1
    const g = cv.getContext('2d', { willReadFrequently: true })
    const px = (cssColor) => {
      g.clearRect(0, 0, 1, 1)
      g.fillStyle = cssColor
      g.fillRect(0, 0, 1, 1)
      g.fillStyle = cssColor
      g.fillRect(0, 0, 1, 1)
      const d = g.getImageData(0, 0, 1, 1).data
      return { r: d[0], g: d[1], b: d[2] }
    }
    const card = document.querySelector('[data-tour-card]')
    const cardBgColor = (() => {
      // first opaque ancestor background of the card. Chrome 156 serializes
      // opaque colors as lab()/oklch; alpha appears as a ' / a' suffix
      // (modern form), an rgba(...,a) 4th component (legacy form), or the
      // literal 'transparent'. Any of those means see-through: keep walking.
      let e = card
      while (e && e !== document.documentElement) {
        const s = getComputedStyle(e).backgroundColor
        if (s && s !== 'transparent' && !s.includes(' / ')) {
          const m = s.match(/rgba?\(([^)]+)\)/)
          const parts = m ? m[1].split(',').map((x) => parseFloat(x)) : null
          if (!(parts && parts.length >= 4 && parts[3] < 0.95)) return s
        }
        e = e.parentElement
      }
      return null
    })()
    const results = { paletteAttr: html.getAttribute('data-palette'), dark: html.classList.contains('dark') }
    if (card) {
      const heading = card.querySelector('h2')
      const body = card.querySelector('p.text-muted-fg') || card.querySelectorAll('p')[0]
      const cardBg = cardBgColor ? px(cardBgColor) : null
      const lum = (c) => {
        const f = (v) => {
          const x = v / 255
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
      }
      const ratio = (a, b) => ((Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05))
      const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')
      const cardColor = getComputedStyle(card).color
      if (heading) {
        results.headingColor = hex(px(heading ? getComputedStyle(heading).color : cardColor))
        results.titleRatio = cardBg ? ratio(px(getComputedStyle(heading).color), cardBg) : null
      }
      if (body) results.bodyRatio = cardBg ? ratio(px(getComputedStyle(body).color), cardBg) : null
      results.cardBg = cardBg ? hex(cardBg) : null
    }
    const next = Array.from(document.querySelectorAll('button')).find(
      (b) => ['Go to the next tour step', 'Finish the guided tour'].includes(b.getAttribute('aria-label'))
    )
    if (next) {
      const btnBgString = (() => {
        // same opaque detection as the card surface, starting at the button
        let e = next
        while (e && e !== document.documentElement) {
          const s = getComputedStyle(e).backgroundColor
          if (s && s !== 'transparent' && s !== 'rgba(0, 0, 0, 0)' && !s.includes(' / ')) {
            const m = s.match(/rgba?\(([^)]+)\)/)
            const parts = m ? m[1].split(',').map((x) => parseFloat(x)) : null
            if (!(parts && parts.length >= 4 && parts[3] < 0.95)) return s
          }
          e = e.parentElement
        }
        return null
      })()
      const btnBg = btnBgString ? px(btnBgString) : null
      const col = px(getComputedStyle(next).color)
      const lum = (c) => {
        const f = (v) => {
          const x = v / 255
          return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
      }
      const ratio = (a, b) => ((Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05))
      const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')
      results.btnColor = hex(col)
      results.btnBg = btnBg ? hex(btnBg) : null
      results.btnRatio = btnBg ? ratio(col, btnBg) : null
    }
    const ov = document.querySelector('[data-tour-overlay]')
    results.scrimVisible = ov
      ? (() => {
          // Dimming mechanism: with a spotted target the spotlight element
          // itself casts the scrim as a box-shadow ring — "0 0 0 100vmax
          // color(...)" — which Chrome serializes with a large px spread;
          // without a target a full-screen bg-scrim layer shows instead.
          // bg color alpha rides the color string, opacity stays 1.
          const hasScrimLayer = (el) => {
            const layer = el?.querySelector('[class*="bg-scrim"]')
            if (!layer) return false
            const s = getComputedStyle(layer).backgroundColor
            return s && s !== 'transparent' && !s.match(/rgba\(0, 0, 0, 0\)$/)
          }
          const spot = ov.querySelector('[data-tour-spotlight]') || ov.querySelector('[class*="ring-blue"]')
          const shadowOk = spot
            ? /0px 0px 0px \d{3,}px|100vmax/.test(getComputedStyle(spot).boxShadow)
            : false
          return hasScrimLayer(ov) || shadowOk
        })()
      : false
    return results
  })

const run = async () => {
  mkdirSync(SHOTS, { recursive: true })
  await ensureMongod()
  await ensureDevServer()
  const browser = await launchBrowser()
  const progress = (m) => console.error(`[07-themes] ${m}`)
  writeManifest(OUT, [
    `command: ${invocationLine('07-themes.mjs')}`,
    `node: ${process.version}`,
    `scope: G1 all seven theme choices in their concrete combinations (light, dark, midnight/slate/oled with data-palette, custom on light+dark from a saved editor theme, system resolved both ways with the palette attribute stripped)`,
    `custom theme content: the app's own Custom seed (accent ${DEFAULT_CUSTOM_COLORS.accent}, background ${DEFAULT_CUSTOM_COLORS.background}, surface ${CUSTOM.vars['--color-slate-900'] || 'vars map'}) written to aics_custom_theme exactly as the editor saves it`,
  ])

  for (const row of rows) {
    progress(row.id)
    const storage = { aics_theme: row.theme, aics_palette: row.palette }
    if (row.palette === 'custom') storage.aics_custom_theme = JSON.stringify(CUSTOM)
    const ctx = await gateContext(browser, { colorScheme: row.colorScheme, localStorage: storage })
    const page = await openPortal(ctx)
    await startTour(page)
    const state = await settledState(page)
    const th = await read(page)
    const okPalette = th.paletteAttr === row.paletteAttr && th.dark === row.dark
    step(`${row.id}: html reflects the choice (dark=${row.dark}, data-palette=${String(row.paletteAttr)})`, okPalette, `got dark=${th.dark} data-palette=${String(th.paletteAttr)}`)
    const titleOk = th.titleRatio !== null && th.titleRatio >= 4.5
    step(`${row.id}: card title text >= 4.5:1 against the card surface — ${th.titleRatio != null ? th.titleRatio.toFixed(2) : 'n/a'}`, titleOk, `color=${th.headingColor} bg=${th.cardBg}`)
    const bodyOk = th.bodyRatio !== null && th.bodyRatio >= 4.5
    step(`${row.id}: card body text >= 4.5:1 against the card surface — ${th.bodyRatio != null ? th.bodyRatio.toFixed(2) : 'n/a'}`, bodyOk, `bg=${th.cardBg}`)
    step(`${row.id}: scrim layer visible over the page`, th.scrimVisible === true)
    const assertActionContrast = (name, sample) => {
      const ratio = sample.btnRatio
      step(`${row.id}: ${name} text >= 4.5:1`, Number.isFinite(ratio) && ratio >= 4.5,
        `${ratio?.toFixed(2) ?? 'n/a'}:1 (fg ${sample.btnColor} on bg ${sample.btnBg})`)
    }
    assertActionContrast('Next', th)
    await page.hover('button[aria-label="Go to the next tour step"]')
    await page.waitForTimeout(250) // let the button's CSS color transition settle
    assertActionContrast('Next hovered', await read(page))
    await page.screenshot({ path: resolve(SHOTS, row.id + '.png') })
    // Read Finish as rendered on the real last step; do not complete the
    // tour, so this contrast check needs no progress write.
    for (let index = 2; index <= 7; index++) {
      await clickNext(page)
      await waitForStep(page, `dev-${index}`)
    }
    await waitForStep(page, 'dev-8') // absent target deliberately auto-skips
    await settledState(page)
    await page.mouse.move(0, 0)
    await page.waitForTimeout(250)
    assertActionContrast('Finish', await read(page))
    await page.hover('button[aria-label="Finish the guided tour"]')
    await page.waitForTimeout(250)
    assertActionContrast('Finish hovered', await read(page))
    await page.close()
    await ctx.close()
  }

  writeReport(
    OUT,
    'theme-matrix',
    'G1: all seven theme choices in their concrete combinations. Card title, body, Next, and Finish text must meet 4.5:1 against their rendered surfaces. Actions are checked in normal and hovered states. The saved custom theme uses the app Custom editor seed.',
    [
      ['Method', 'Per row: a fresh context writes the theme storage keys the way the Settings UI writes them. The tour opens on dev-1 at 1280x800. Assertions read html.dark, html[data-palette], resolved card and text colors, scrim visibility, and Next colors. The real tour then advances to dev-8 to measure Finish without completing or persisting progress. Both actions are measured with the pointer outside and over the button after its color transition settles. Contrast uses the WCAG formula on browser-resolved sRGB colors. Missing measurements fail.'],
      ['Scope', 'The actions use the card ink/surface pair. This fixes the tour controls only; it does not recalibrate the portal custom accent tokens. A failed action contrast assertion blocks G1.'],
    ]
  )

  console.log(failures === 0 ? '\n07-themes: ALL PASS' : `\n07-themes: ${failures} FAILURES`)
  process.exitCode = failures === 0 ? 0 : 1
  stopDevServer()
  await browser.close()
}

run().catch((err) => {
  console.error('07-themes failed:', err)
  process.exit(1)
})
