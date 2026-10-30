// Tour engine geometry (onboarding plan, Phase 2).
//
// Pure positioning math for the spotlight overlay: no DOM imports, so
// the same functions unit-test under bun and run in the browser. The
// overlay component feeds measured DOMRects in and applies the returned
// layout as inline styles; every clamp and flip decision lives here.

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface Vpt {
  width: number
  height: number
}

export type CardSide = 'top' | 'bottom' | 'left' | 'right' | 'center'

/** Padding between the target's border box and the spotlight ring. */
export const SPOTLIGHT_PAD = 8
/** Gap between the spotlight ring and the step card. */
export const CARD_GAP = 12
/** Minimum distance a clamped card keeps from the viewport edge. */
export const CARD_EDGE_MARGIN = 8

/** Inflate the target rect into the spotlight rect (the visible ring). */
export function spotlightRect(target: Rect, pad = SPOTLIGHT_PAD): Rect {
  return {
    top: target.top - pad,
    left: target.left - pad,
    width: target.width + pad * 2,
    height: target.height + pad * 2,
  }
}

export interface CardLayout {
  side: CardSide
  top: number
  left: number
}

const OPPOSITE: Record<CardSide, CardSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
  center: 'center',
}

/**
 * Side evaluation order: the preferred side first, then its opposite
 * (the flip rule), then the remaining sides. A caller passing 'center'
 * gets the plain bottom-up order; centering is the final fallback in
 * placeCard, never a preferred side.
 */
export function sideOrder(preferred: CardSide): CardSide[] {
  const rest: CardSide[] = ['bottom', 'top', 'right', 'left']
  const out: CardSide[] = []
  for (const side of [preferred, OPPOSITE[preferred], ...rest]) {
    if (side !== 'center' && !out.includes(side)) out.push(side)
  }
  return out
}

/** Position for one candidate side, or null when it does not fit. */
function trySide(
  side: CardSide,
  spot: Rect,
  card: { width: number; height: number },
  vpt: Vpt
): CardLayout | null {
  if (side === 'top') {
    const top = spot.top - CARD_GAP - card.height
    if (top < 0) return null
    return { side, top, left: spot.left + spot.width / 2 - card.width / 2 }
  }
  if (side === 'bottom') {
    const top = spot.top + spot.height + CARD_GAP
    if (top + card.height > vpt.height) return null
    return { side, top, left: spot.left + spot.width / 2 - card.width / 2 }
  }
  if (side === 'left') {
    const left = spot.left - CARD_GAP - card.width
    if (left < 0) return null
    return { side, top: spot.top + spot.height / 2 - card.height / 2, left }
  }
  const left = spot.left + spot.width + CARD_GAP
  if (left + card.width > vpt.width) return null
  return { side, top: spot.top + spot.height / 2 - card.height / 2, left }
}

function clampCard(laid: CardLayout, card: { width: number; height: number }, vpt: Vpt): CardLayout {
  const maxLeft = Math.max(CARD_EDGE_MARGIN, vpt.width - card.width - CARD_EDGE_MARGIN)
  const maxTop = Math.max(CARD_EDGE_MARGIN, vpt.height - card.height - CARD_EDGE_MARGIN)
  return {
    side: laid.side,
    top: Math.min(Math.max(CARD_EDGE_MARGIN, laid.top), maxTop),
    left: Math.min(Math.max(CARD_EDGE_MARGIN, laid.left), maxLeft),
  }
}

/**
 * Place the step card beside the spotlight: honor the preferred side,
 * flip to the opposite side when it does not fit, try the remaining
 * sides, and center the card in the viewport when nothing fits. Both
 * axes clamp inside the viewport with an edge margin, so the card can
 * never strand off-screen near a viewport edge (B1, C1).
 */
export function placeCard(
  spot: Rect,
  card: { width: number; height: number },
  preferred: CardSide,
  vpt: Vpt
): CardLayout {
  for (const side of sideOrder(preferred)) {
    const laid = trySide(side, spot, card, vpt)
    if (laid) return clampCard(laid, card, vpt)
  }
  return centeredCard(card, vpt)
}

/** The no-spotlight fallback: card centered in the viewport. */
export function centeredCard(card: { width: number; height: number }, vpt: Vpt): CardLayout {
  return {
    side: 'center',
    top: Math.max(0, (vpt.height - card.height) / 2),
    left: Math.max(0, (vpt.width - card.width) / 2),
  }
}
