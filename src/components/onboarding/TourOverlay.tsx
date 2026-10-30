'use client'

// Onboarding tour engine (onboarding plan, Phase 2).
//
// In-house spotlight overlay built on the pieces the project already
// has (D2, zero new dependencies):
//   - DialogPanel supplies the focus contract: focus moves in on
//     mount, Tab cycles inside the card, Escape closes, focus returns
//     to the triggering element on unmount (D1/D2).
//   - The sr-only polite status region pattern comes from GlobalSearch
//     and announces start and step changes (D3).
//   - Motion goes through the shell's MotionConfig reducedMotion="user"
//     plus the local useReducedMotion check, so the spotlight settles
//     without animation when the user prefers reduced motion (E1).
//
// Documented behaviors (each one is a gate criterion):
//   - The scrim and spotlight are pointer-transparent; only the step
//     card takes pointer events. The page underneath stays clickable,
//     so a mid-tour navigation is a view swap the engine follows, and
//     overlays that open above the tour get the user's focus without
//     the engine fighting for it (C5, H1).
//   - Target resolution: a [data-tour] element that is visible. Missing
//     at step open waits out the step's budget, then skips the step
//     with a live announcement (B2, B3). Removed after it was found
//     releases the spotlight and centers the card, keeping the step
//     operable (B4). A step carrying a view navigates through the
//     host's onNavigate first; the waiting rule covers the incoming
//     view's mount (C4).
//   - Layer: z-40 in the shell ladder, above content and the sticky
//     topbar/sidebar so nav targets can be framed, below the z-50
//     drawers, modals, dropdowns and toasts, which therefore paint
//     above the tour (C5).
//   - Below the sm breakpoint the card renders as a bottom sheet and
//     the spotlight collapses to a plain scrim (F1).
//   - Scrim color and card surfaces come from the theme tokens
//     (--scrim, --surface, --ink, --muted-fg, --border), so all seven
//     theme choices ride the same classes (G1).

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DialogPanel } from '@/components/portal/DialogPanel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { View } from '@/lib/aics/types'
import {
  centeredCard,
  placeCard,
  spotlightRect,
  type CardLayout,
  type Rect,
} from '@/lib/onboarding/tour/geometry'
import {
  MAX_TARGET_WAIT_MS,
  stepAnnouncement,
  stepDisposition,
  type StepDisposition,
  type TourStep,
} from '@/lib/onboarding/tour/steps'

const SHEET_QUERY = '(min-width: 640px)'
const DEFAULT_CARD_SIZE = { width: 320, height: 200 }

/** Viewport for first paint; real values arrive on the first rAF pass. */
function safeVpt() {
  return typeof window === 'undefined'
    ? { width: 1280, height: 800 }
    : { width: window.innerWidth, height: window.innerHeight }
}

function cardSizeFor(vpt: { width: number; height: number }) {
  return DEFAULT_CARD_SIZE
}

export interface TourOverlayProps {
  steps: TourStep[]
  /** completed=true when the user reached the end; false when skipped. */
  onFinish: (completed: boolean) => void
  /** Cross-view steps navigate through the app's own navigation. */
  onNavigate?: (view: View) => void
  /** Fires on every step open; the dev host arms its synthetic board. */
  onStepChange?: (step: TourStep, index: number) => void
}

interface LayoutState {
  disposition: StepDisposition
  spot: Rect | null
  card: CardLayout
}

export function TourOverlay({ steps, onFinish, onNavigate, onStepChange }: TourOverlayProps) {
  const [index, setIndex] = useState(0)
  const [sheet, setSheet] = useState(() =>
    typeof window === 'undefined' ? false : !window.matchMedia(SHEET_QUERY).matches
  )
  const [announcement, setAnnouncement] = useState('')
  const [layout, setLayout] = useState<LayoutState>(() => ({
    disposition: 'waiting',
    spot: null,
    card: centeredCard(DEFAULT_CARD_SIZE, safeVpt()),
  }))

  const reduced = useReducedMotion()
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement | null>(null)
  const cardWrapRef = useRef<HTMLDivElement | null>(null)
  const everFoundRef = useRef(false)
  const waitStartRef = useRef(0)
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rafRef = useRef<number | null>(null)
  const navigatedForRef = useRef<string | null>(null)
  const ensuredVisibleRef = useRef(false)
  const advancedRef = useRef(false)
  const pendingNoteRef = useRef('')
  const indexRef = useRef(0)
  const dispositionRef = useRef<StepDisposition>('waiting')

  const step = steps[index]
  const total = steps.length

  // The whole resolution-and-layout pass. Runs from a rAF everywhere
  // (schedule below), so state updates never land synchronously inside
  // an effect and every pass coalesces into one frame.
  const tick = useCallback(() => {
    const current = steps[indexRef.current]
    if (!current) return

    const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(current.target)}"]`)
    const found = !!el && el.getClientRects().length > 0
    if (found) everFoundRef.current = true

    const maxWait = current.maxWaitMs ?? MAX_TARGET_WAIT_MS
    const waitMs = Date.now() - waitStartRef.current
    const disposition = stepDisposition({
      found,
      everFound: everFoundRef.current,
      waitMs,
      maxWaitMs: maxWait,
    })
    dispositionRef.current = disposition

    // A target that never appeared skips the step forward, once. The
    // skip note goes to a pending ref rather than the live region: the
    // next step's announcement composes with it, so screen readers hear
    // one sentence carrying both facts instead of a frame-lifetime
    // blip the next step immediately overwrites.
    if (disposition === 'skipped' && !advancedRef.current) {
      advancedRef.current = true
      pendingNoteRef.current = `Step skipped: ${current.title} target is not available.`
      if (indexRef.current >= steps.length - 1) onFinish(true)
      else setIndex(indexRef.current + 1)
      return
    }

    if (disposition === 'spot' && el && !ensuredVisibleRef.current) {
      ensuredVisibleRef.current = true
      el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
    }

    const vpt = { width: window.innerWidth, height: window.innerHeight }
    if (disposition === 'spot' && el) {
      const spot = spotlightRect(el.getBoundingClientRect())
      const measured = cardWrapRef.current
      const cardSize = measured
        ? { width: measured.offsetWidth, height: measured.offsetHeight }
        : DEFAULT_CARD_SIZE
      setLayout({ disposition, spot, card: placeCard(spot, cardSize, current.side ?? 'bottom', vpt) })
    } else {
      setLayout({ disposition, spot: null, card: centeredCard(cardSizeFor(vpt), vpt) })
    }
  }, [steps, onFinish, reduced])

  const schedule = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      tick()
    })
  }, [tick])

  // Per-step open: reset the step's resolution bookkeeping, navigate on
  // cross-view steps (once per step), announce, and focus the heading.
  useEffect(() => {
    const current = steps[index]
    if (!current) return
    indexRef.current = index
    everFoundRef.current = false
    ensuredVisibleRef.current = false
    advancedRef.current = false
    waitStartRef.current = Date.now()
    if (waitTimerRef.current !== null) {
      clearTimeout(waitTimerRef.current)
      waitTimerRef.current = null
    }
    if (current.view && navigatedForRef.current !== current.id) {
      navigatedForRef.current = current.id
      onNavigate?.(current.view)
    }
    onStepChange?.(current, index)
    const raf = requestAnimationFrame(() => {
      const note = pendingNoteRef.current
      pendingNoteRef.current = ''
      setAnnouncement((note ? `${note} ` : '') + stepAnnouncement(current, index, steps.length))
      headingRef.current?.focus({ preventScroll: true })
    })
    // The wait budget ends on its own even when nothing in the DOM
    // changes: one timer per step, resolved by the same rAF pass.
    waitTimerRef.current = setTimeout(
      () => {
        waitTimerRef.current = null
        schedule()
      },
      (current.maxWaitMs ?? MAX_TARGET_WAIT_MS) + 60
    )
    schedule()
    return () => {
      cancelAnimationFrame(raf)
      if (waitTimerRef.current !== null) {
        clearTimeout(waitTimerRef.current)
        waitTimerRef.current = null
      }
    }
  }, [index, onNavigate, onStepChange, schedule, steps])

  // Repositioning loop: resize, scroll (capture, the page scrolls the
  // window), DOM mutations (late mounts, unmounts, skeleton resolve),
  // and the mobile breakpoint. All coalesce into one rAF.
  useEffect(() => {
    // childList covers mounts/unmounts (late targets, view swaps,
    // skeletons resolving); attributes covers display/visibility flips
    // on existing elements (a nav item hidden by class, a target whose
    // data-tour hook appears). All coalesced into one rAF.
    const observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-tour', 'class', 'style', 'hidden'],
    })
    window.addEventListener('resize', schedule, { passive: true })
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    const mql = window.matchMedia(SHEET_QUERY)
    const onSheet = (e: MediaQueryListEvent) => {
      setSheet(!e.matches)
      schedule()
    }
    mql.addEventListener('change', onSheet)
    schedule()
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true } as EventListenerOptions)
      mql.removeEventListener('change', onSheet)
      // StrictMode dev double-mount cancels the in-flight frame in this
      // cleanup; the guard must be cleared with it or every later
      // schedule() hits a stale id and never runs again.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (waitTimerRef.current !== null) clearTimeout(waitTimerRef.current)
    }
  }, [schedule])

  if (!step) return null

  const isLast = index === total - 1
  const cardStyle = sheet ? undefined : { top: layout.card.top, left: layout.card.left }
  const showSpotlight = layout.disposition === 'spot' && !sheet

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none"
      data-tour-overlay=""
      data-step-id={step.id}
      data-disposition={layout.disposition}
    >
      {/* Live region (D3): sr-only polite status, the GlobalSearch pattern. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {/* Scrim. With a spotted target the spotlight element itself casts
          the dim through a huge outer box-shadow (a hole at the ring,
          pointer-transparent everywhere). Without a target, or on the
          mobile sheet, a plain full-screen scrim dims the page. Both
          layers are decorative visuals: aria-hidden keeps them out of
          the accessibility tree (D4 — everything exposed to AT is
          named; the ring carries no semantics of its own). */}
      {showSpotlight && layout.spot ? (
        <motion.div
          data-tour-spotlight=""
          aria-hidden="true"
          className="absolute rounded-xl ring-2 ring-blue-500"
          initial={false}
          animate={{
            top: layout.spot.top,
            left: layout.spot.left,
            width: layout.spot.width,
            height: layout.spot.height,
          }}
          transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
          style={{ boxShadow: '0 0 0 100vmax color-mix(in srgb, var(--scrim) 45%, transparent)' }}
        />
      ) : (
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-scrim/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.15 }}
        />
      )}

      {/* Step card: one DialogPanel for the whole tour, so the focus
          contract is exactly the portal's — focus in on open, Tab
          inside, Escape ends the tour, focus returns to the launcher.
          The mobile sheet pins to the bottom (F1). */}
      <div
        ref={cardWrapRef}
        style={cardStyle}
        className={cn(
          'pointer-events-auto',
          sheet ? 'fixed inset-x-3 bottom-3' : 'absolute',
          sheet ? '' : 'w-fit'
        )}
      >
        <DialogPanel
          onClose={() => onFinish(false)}
          aria-labelledby={headingId}
          data-tour-card=""
          className={cn(
            'rounded-xl border border-border bg-surface p-4 text-ink shadow-xl',
            sheet ? 'rounded-b-sm' : 'w-72 max-w-[calc(100vw-24px)]'
          )}
        >
          <p className="text-xs font-medium text-muted-fg">
            Step {index + 1} of {total}
          </p>
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="mt-1 text-sm font-bold outline-none">
            {step.title}
          </h2>
          <p className="mt-1.5 text-sm text-muted-fg">{step.body}</p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onFinish(false)}
              aria-label="Skip the guided tour"
            >
              Skip tour
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                aria-label="Go back to the previous tour step"
              >
                Back
              </Button>
              {isLast ? (
                <Button type="button" size="sm" onClick={() => onFinish(true)} aria-label="Finish the guided tour">
                  Finish
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
                  aria-label="Go to the next tour step"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </DialogPanel>
      </div>
    </div>
  )
}
