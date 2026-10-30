// Tour step model and target-resolution contract (onboarding plan,
// Phase 2).
//
// The documented rules the engine applies to every step, as pure
// functions so they unit-test under bun and the browser component
// stays thin:
//
//   spot      target exists and is visible -> frame it
//   waiting   target not there yet (async mount, cross-view swap) and
//             the wait budget is not spent -> hold, paint no spotlight
//   skipped   target never appeared within the wait budget -> skip the
//             step forward with a live announcement
//   centered  target existed, then vanished mid-step -> keep the step
//             operable, release the spotlight, center the card
//
// A step may carry a view: the engine asks the host to navigate there
// through the app's own pushState navigation before resolving, and the
// waiting rule covers the mount (C4). maxWaitMs is per-step data so a
// synthetic tour can keep its missing-target demo snappy; the default
// is the engine-wide budget.

import type { CardSide } from '@/lib/onboarding/tour/geometry'
import type { View } from '@/lib/aics/types'

export interface TourStep {
  id: string
  /** data-tour value on the target element. */
  target: string
  title: string
  body: string
  /** Preferred card side; the geometry layer flips when it cannot fit. */
  side?: CardSide
  /** When set, the engine navigates to this view before resolving. */
  view?: View
  /** Wait budget for this step's target; default MAX_TARGET_WAIT_MS. */
  maxWaitMs?: number
}

export const MAX_TARGET_WAIT_MS = 4000

export type StepDisposition = 'spot' | 'waiting' | 'skipped' | 'centered'

export interface DispositionInput {
  /** Target element exists and is visible right now. */
  found: boolean
  /** Target was found at least once since this step opened. */
  everFound: boolean
  /** Milliseconds spent waiting on this step so far. */
  waitMs: number
  /** Budget, from the step or the engine default. */
  maxWaitMs: number
}

export function stepDisposition(input: DispositionInput): StepDisposition {
  if (input.found) return 'spot'
  if (input.everFound) return 'centered'
  if (input.waitMs < input.maxWaitMs) return 'waiting'
  return 'skipped'
}

/** Build the live-region sentence for a step (D3: start and changes). */
export function stepAnnouncement(step: TourStep, index: number, total: number): string {
  return `Guided tour, step ${index + 1} of ${total}: ${step.title}.`
}
