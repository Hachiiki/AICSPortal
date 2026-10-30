// Unit tests for the tour engine's pure layer (onboarding plan, Phase 2).
//
// Pins the documented geometry and resolution rules: spotlight padding,
// the flip rule near viewport edges, the clamp rule, the centered
// fallback, and the step dispositions (spot / waiting / skipped /
// centered). Same conventions as the registry suite: bun test, pure
// logic, no DOM, no environment. Run with `bun test src/lib/onboarding/`.

import { describe, expect, it } from 'bun:test'
import {
  CARD_EDGE_MARGIN,
  CARD_GAP,
  SPOTLIGHT_PAD,
  centeredCard,
  placeCard,
  sideOrder,
  spotlightRect,
} from './geometry'
import { MAX_TARGET_WAIT_MS, stepAnnouncement, stepDisposition, type TourStep } from './steps'

const VPT = { width: 1280, height: 800 }
const CARD = { width: 320, height: 200 }

describe('spotlightRect', () => {
  it('inflates the target by the pad on every side', () => {
    const spot = spotlightRect({ top: 100, left: 200, width: 40, height: 20 })
    expect(spot).toEqual({
      top: 100 - SPOTLIGHT_PAD,
      left: 200 - SPOTLIGHT_PAD,
      width: 40 + SPOTLIGHT_PAD * 2,
      height: 20 + SPOTLIGHT_PAD * 2,
    })
  })
})

describe('sideOrder', () => {
  it('preferred side first, then its opposite, then the rest', () => {
    expect(sideOrder('bottom')).toEqual(['bottom', 'top', 'right', 'left'])
    expect(sideOrder('right')).toEqual(['right', 'left', 'bottom', 'top'])
  })

  it('center degrades to the plain order (centering is the final fallback)', () => {
    expect(sideOrder('center')).toEqual(['bottom', 'top', 'right', 'left'])
  })
})

describe('placeCard', () => {
  it('honors the preferred side when there is room', () => {
    const spot = { top: 300, left: 500, width: 100, height: 50 }
    const laid = placeCard(spot, CARD, 'bottom', VPT)
    expect(laid.side).toBe('bottom')
    expect(laid.top).toBe(spot.top + spot.height + CARD_GAP)
  })

  it('flips to the opposite side when the preferred one does not fit (B1)', () => {
    // Spot near the bottom edge: 'bottom' cannot fit, flips to 'top'.
    const spot = { top: 700, left: 500, width: 100, height: 50 }
    const laid = placeCard(spot, CARD, 'bottom', VPT)
    expect(laid.side).toBe('top')
    expect(laid.top).toBe(spot.top - CARD_GAP - CARD.height)
  })

  it('clamps horizontally near the left edge so the card stays on screen (B1)', () => {
    const spot = { top: 300, left: 0, width: 100, height: 50 }
    const laid = placeCard(spot, CARD, 'bottom', VPT)
    expect(laid.side).toBe('bottom')
    expect(laid.left).toBe(CARD_EDGE_MARGIN)
  })

  it('clamps horizontally near the right edge', () => {
    const spot = { top: 300, left: VPT.width - 100, width: 100, height: 50 }
    const laid = placeCard(spot, CARD, 'bottom', VPT)
    expect(laid.left).toBe(VPT.width - CARD.width - CARD_EDGE_MARGIN)
  })

  it('tries the remaining sides before falling back to center', () => {
    // A tall card in a short viewport with the spot mid-screen: the
    // vertical sides cannot fit, so the geometry takes the right side.
    const tall = { width: 320, height: 700 }
    const spot = { top: 60, left: 600, width: 100, height: 50 }
    const laid = placeCard(spot, tall, 'bottom', VPT)
    expect(laid.side).toBe('right')
    expect(laid.left).toBe(spot.left + spot.width + CARD_GAP)
    // The vertical center of a tall card clamps to the viewport edge.
    expect(laid.top).toBe(CARD_EDGE_MARGIN)
  })

  it('centers the card when no side fits at all', () => {
    const huge = { width: 400, height: 400 }
    const vpt = { width: 420, height: 420 }
    const spot = { top: 200, left: 200, width: 20, height: 20 }
    const laid = placeCard(spot, huge, 'bottom', vpt)
    expect(laid.side).toBe('center')
    expect(laid.top).toBe(10)
    expect(laid.left).toBe(10)
  })
})

describe('centeredCard', () => {
  it('centers with clamping when the card is larger than the viewport', () => {
    const laid = centeredCard({ width: 1400, height: 900 }, VPT)
    expect(laid.top).toBe(0)
    expect(laid.left).toBe(0)
  })
})

describe('stepDisposition (the documented target-resolution contract)', () => {
  it('a visible target spots', () => {
    expect(stepDisposition({ found: true, everFound: false, waitMs: 0, maxWaitMs: 100 })).toBe('spot')
  })

  it('an absent target inside the budget waits (B3 delayed mounts)', () => {
    expect(stepDisposition({ found: false, everFound: false, waitMs: 100, maxWaitMs: 4000 })).toBe('waiting')
  })

  it('an absent target past the budget skips (B2 missing at open)', () => {
    expect(stepDisposition({ found: false, everFound: false, waitMs: 4000, maxWaitMs: 4000 })).toBe('skipped')
    expect(stepDisposition({ found: false, everFound: false, waitMs: 5000, maxWaitMs: MAX_TARGET_WAIT_MS })).toBe('skipped')
  })

  it('a target that vanishes after being found centers the card (B4 removed mid-tour)', () => {
    expect(stepDisposition({ found: false, everFound: true, waitMs: 0, maxWaitMs: 4000 })).toBe('centered')
    // Even past the wait budget: never "skipped", the step stays operable.
    expect(stepDisposition({ found: false, everFound: true, waitMs: 9999, maxWaitMs: 4000 })).toBe('centered')
  })
})

describe('stepAnnouncement (D3)', () => {
  it('carries the position and the title', () => {
    const step: TourStep = { id: 's1', target: 'x', title: 'Look here', body: '' }
    expect(stepAnnouncement(step, 0, 8)).toBe('Guided tour, step 1 of 8: Look here.')
  })
})
