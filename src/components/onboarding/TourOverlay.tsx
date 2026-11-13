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
//   - On phones the collapsible card fits above or below the spotlight.
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
  CARD_GAP,
  centeredCard,
  placeCard,
  placePhoneGuide,
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
// Keep the primary action legible across standard and custom themes.
const ACTION_COLORS = 'bg-[#1d4ed8] text-white hover:bg-[#1e40af] hover:text-white'

/** Viewport for first paint; real values arrive on the first rAF pass. */
function safeVpt() {
  return typeof window === 'undefined'
    ? { width: 1280, height: 800 }
    : { width: window.innerWidth, height: window.innerHeight }
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
  phoneCard?: { top: number; maxHeight: number; scrollPanel: boolean; moreInstructions: boolean }
  headerTarget?: boolean
}

export function TourOverlay({ steps, onFinish, onNavigate, onStepChange }: TourOverlayProps) {
  const [index, setIndex] = useState(0)
  const [sheet, setSheet] = useState(() =>
    typeof window === 'undefined' ? false : !window.matchMedia(SHEET_QUERY).matches
  )
  const [announcement, setAnnouncement] = useState('')
  const [minimizedStep, setMinimizedStep] = useState<string | null>(null)
  const [layout, setLayout] = useState<LayoutState>(() => ({
    disposition: 'waiting',
    spot: null,
    card: centeredCard(DEFAULT_CARD_SIZE, safeVpt()),
  }))

  const reduced = useReducedMotion()
  const headingId = useId()
  const bodyId = useId()
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

    // H1 focus guard. An unplanned mid-tour navigation can unmount the
    // element the user was interacting with (the click that swapped the
    // view), and focus then silently falls to <body> while this
    // guide stays open. Overlays that open above the tour keep
    // their own focus (C5), so the guard repairs only genuinely stranded
    // focus - body, the root, or a disconnected node - and never touches
    // a live element elsewhere. It runs in the same rAF pass as the
    // layout so the repair lands with the repositioned frame.
    const active = document.activeElement
    const stranded =
      !active ||
      active === document.body ||
      active === document.documentElement ||
      !(active as HTMLElement).isConnected
    if (stranded && cardWrapRef.current?.isConnected) {
      headingRef.current?.focus({ preventScroll: true })
    }

    const mobile = !window.matchMedia(SHEET_QUERY).matches
    const target = (key: string) => Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${CSS.escape(key)}"]`))
      .find(element => !element.closest('[inert]') && element.getClientRects().length > 0)
    const viewport = window.visualViewport
    const top = (viewport?.offsetTop ?? 0) + 12
    const viewportBottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight)
    const short = mobile && viewportBottom - top < 500
    const el = (short && current.shortPhoneTarget ? target(current.shortPhoneTarget) : undefined)
      ?? (mobile && current.phoneTarget ? target(current.phoneTarget) : undefined)
      ?? target(current.target)
    const headerTarget = !!el?.closest('header')
    const dockTarget = !!el?.closest('[data-student-mobile-nav]')
    const header = mobile ? document.querySelector<HTMLElement>('.portal-topbar') : null
    const found = !!el
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
      if (indexRef.current >= steps.length - 1) onFinish(false)
      else setIndex(indexRef.current + 1)
      return
    }

    const vpt = { width: window.innerWidth, height: window.innerHeight }
    if (mobile) {
      const measured = cardWrapRef.current?.querySelector<HTMLElement>('[data-tour-card]')
      const instructions = measured?.querySelector<HTMLElement>('[data-tour-instructions]')
      const chrome = measured && instructions ? measured.offsetHeight - instructions.offsetHeight : measured?.offsetHeight ?? 56
      const textHeight = instructions?.scrollHeight ?? 0
      const dock = document.querySelector('[data-student-mobile-nav]')
      const dockTop = dock?.getBoundingClientRect().top ?? viewportBottom
      const bottom = Math.max(top, Math.min(dockTop, viewportBottom) - 12)
      const visibleTargetTop = headerTarget || dockTarget ? top : Math.max(top, header?.getBoundingClientRect().bottom ?? top)
      const card = {
        height: chrome + textHeight,
        minimum: chrome + Math.min(48, textHeight),
      }
      if (disposition === 'spot' && el && measured && !ensuredVisibleRef.current) {
        ensuredVisibleRef.current = true
        if (!headerTarget && !dockTarget) {
          const spot = spotlightRect(el.getBoundingClientRect())
          const scrollRoot = document.scrollingElement
          const maxScroll = Math.max(0, (scrollRoot?.scrollHeight ?? vpt.height) - vpt.height)
          const contentTop = Math.max(top, (viewport?.offsetTop ?? 0) + (header?.offsetHeight ?? 0) + 4)
          const start = Math.min(maxScroll, Math.max(0, window.scrollY + spot.top - contentTop))
          const end = Math.min(maxScroll, Math.max(0, window.scrollY + spot.top + spot.height - bottom))
          const shiftedTop = spot.top + window.scrollY - start
          const fitsAtStart = shiftedTop >= contentTop - 1 && shiftedTop + spot.height + CARD_GAP + card.minimum <= bottom
          const fitsAtEnd = spot.top + window.scrollY - end >= top + card.minimum + CARD_GAP
          window.scrollTo({ top: !fitsAtStart && fitsAtEnd ? end : start, behavior: 'instant' })
        }
      }
      const spot = disposition === 'spot' && el ? spotlightRect(el.getBoundingClientRect()) : null
      const phoneCard = placePhoneGuide(spot, card, {
        top, bottom, spotlightTop: visibleTargetTop, spotlightBottom: dockTarget ? viewportBottom : bottom,
      }, current.side ?? 'bottom')
      setLayout({
        disposition,
        spot: phoneCard.spot,
        card: centeredCard(DEFAULT_CARD_SIZE, vpt),
        phoneCard: {
          ...phoneCard,
          scrollPanel: phoneCard.maxHeight <= chrome,
          moreInstructions: textHeight - (phoneCard.maxHeight - chrome) - (instructions?.scrollTop ?? 0) > 1,
        },
        headerTarget,
      })
      return
    }
    if (disposition === 'spot' && el) {
      if (!ensuredVisibleRef.current) {
        ensuredVisibleRef.current = true
        el.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' })
      }
      const spot = spotlightRect(el.getBoundingClientRect())
      const measured = cardWrapRef.current
      const cardSize = measured
        ? { width: measured.offsetWidth, height: measured.offsetHeight }
        : DEFAULT_CARD_SIZE
      setLayout({ disposition, spot, card: placeCard(spot, cardSize, current.side ?? 'bottom', vpt) })
    } else {
      setLayout({ disposition, spot: null, card: centeredCard(DEFAULT_CARD_SIZE, vpt) })
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
      cardWrapRef.current?.querySelector<HTMLElement>('[data-tour-card]')?.scrollTo({ top: 0 })
      cardWrapRef.current?.querySelector<HTMLElement>('[data-tour-instructions]')?.scrollTo({ top: 0 })
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
    const viewport = window.visualViewport
    viewport?.addEventListener('resize', schedule)
    viewport?.addEventListener('scroll', schedule)
    const sizeObserver = new ResizeObserver(schedule)
    if (cardWrapRef.current) sizeObserver.observe(cardWrapRef.current)
    document.addEventListener('transitionend', schedule)
    // Focus changes without a DOM mutation (clicking empty page space
    // blurs to body). Captured focusout schedules the same rAF pass so
    // the H1 guard sees the post-blur active element one frame later.
    document.addEventListener('focusout', schedule, true)
    const mql = window.matchMedia(SHEET_QUERY)
    const onSheet = (e: MediaQueryListEvent) => {
      setSheet(!e.matches)
      schedule()
    }
    mql.addEventListener('change', onSheet)
    schedule()
    return () => {
      observer.disconnect()
      sizeObserver.disconnect()
      viewport?.removeEventListener('resize', schedule)
      viewport?.removeEventListener('scroll', schedule)
      document.removeEventListener('transitionend', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true } as EventListenerOptions)
      document.removeEventListener('focusout', schedule, true)
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

  // The guide is non-modal, so keyboard users can explore the same page as
  // pointer users. Escape leaves the guide unless a menu/dialog above it owns it.
  useEffect(() => {
    const handleGuideKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const active = document.activeElement as HTMLElement | null
      const otherOverlay = active?.closest('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')
      if (otherOverlay && !cardWrapRef.current?.contains(otherOverlay)) return
      if (event.altKey && event.key.toLowerCase() === 'g') {
        event.preventDefault()
        setMinimizedStep(null)
        requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
      } else if (event.key === 'Escape') {
        event.preventDefault()
        onFinish(false)
      }
    }
    document.addEventListener('keydown', handleGuideKey)
    return () => document.removeEventListener('keydown', handleGuideKey)
  }, [onFinish])

  if (!step) return null

  const isLast = index === total - 1
  const minimized = sheet && minimizedStep === step.id
  const cardStyle = sheet ? { top: layout.phoneCard?.top } : { top: layout.card.top, left: layout.card.left }
  const scrollPanel = sheet && !minimized && layout.phoneCard?.scrollPanel
  const showSpotlight = layout.disposition === 'spot' && (layout.spot?.height ?? 0) > 0

  return (
    <div
      className="fixed inset-0 z-40 pointer-events-none"
      data-tour-overlay=""
      data-step-id={step.id}
      data-disposition={layout.disposition}
      data-tour-header-target={layout.headerTarget || undefined}
    >
      {/* Live region (D3): sr-only polite status, the GlobalSearch pattern. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {/* Scrim. With a spotted target the spotlight element itself casts
          the dim through a huge outer box-shadow (a hole at the ring,
          pointer-transparent everywhere). Without a visible target,
          a plain full-screen scrim dims the page. Both
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
          transition={{ duration: reduced || sheet ? 0 : 0.2, ease: 'easeOut' }}
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

      {/* One nonmodal panel preserves focus restoration across steps.
          The phone sheet keeps navigation visible while instructions scroll. */}
      <div
        ref={cardWrapRef}
        style={cardStyle}
        className={cn(
          'pointer-events-auto',
          sheet ? minimized ? 'fixed left-3' : 'fixed inset-x-3' : 'absolute',
          sheet && !layout.phoneCard && 'bottom-[calc(var(--portal-mobile-nav-height,0px)+12px)]',
          sheet ? '' : 'w-fit'
        )}
      >
        <DialogPanel
          onClose={() => onFinish(false)}
          trapFocus={false}
          aria-modal={false}
          aria-label={minimized ? 'Guided tour minimized' : undefined}
          aria-labelledby={minimized ? undefined : headingId}
          aria-describedby={minimized ? undefined : bodyId}
          data-tour-card=""
          data-minimized={minimized}
          style={sheet && layout.phoneCard ? { maxHeight: layout.phoneCard.maxHeight } : undefined}
          className={cn(
            'flex max-h-[calc(100dvh-24px)] flex-col rounded-xl border border-border bg-surface text-ink shadow-xl',
            scrollPanel ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden',
            minimized ? 'p-1' : sheet ? 'p-3 [@media(max-height:500px)]:p-2.5' : 'p-4',
            sheet ? 'max-h-[calc(100dvh-var(--portal-mobile-nav-height,0px)-24px)] rounded-2xl' : 'w-72 max-w-[calc(100vw-24px)]'
          )}
        >
          {minimized ? (
            <Button type="button" variant="ghost" aria-label={`Resume guide · ${index + 1} of ${total}`} className="min-h-11 [@media(max-height:500px)]:px-2" onClick={() => {
              setMinimizedStep(null)
              requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }))
            }}>
              <span className="[@media(max-height:500px)]:hidden">Resume guide · {index + 1} of {total}</span>
              <span className="hidden [@media(max-height:500px)]:inline">Resume</span>
            </Button>
          ) : (
          <>
          <div className="shrink-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-link-strong">Step {index + 1} of {total}</p>
            {sheet && <Button type="button" variant="ghost" size="sm" className="min-h-11" aria-label="Hide guide to explore the page" onClick={() => {
              setMinimizedStep(step.id)
              requestAnimationFrame(() => cardWrapRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }))
            }}>Hide to explore</Button>}
          </div>
          <h2 id={headingId} ref={headingRef} tabIndex={-1} className="mt-1 text-base font-bold leading-snug outline-none sm:text-sm max-sm:[@media(max-height:500px)]:mt-0">
            {step.title}
          </h2>
          </div>
          <div key={step.id} data-tour-instructions="" role="region" aria-label="Tour instructions" tabIndex={0} className={cn(
            'mt-2 min-h-0 rounded-sm [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-link max-sm:[@media(max-height:500px)]:mt-1',
            scrollPanel ? 'shrink-0' : 'overflow-y-auto overscroll-contain',
          )} style={sheet && !scrollPanel && layout.phoneCard?.moreInstructions ? { maskImage: 'linear-gradient(to bottom, black calc(100% - 8px), transparent)' } : undefined}>
          <p id={bodyId} className="text-sm leading-relaxed text-muted-fg">{sheet ? step.phoneBody ?? step.body : step.body}</p>
          {!sheet && <p className="mt-2 text-xs text-muted-fg">Explore the highlighted area. Press Alt+G to return to this guide.</p>}
          </div>
          <div className="mt-2 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border pt-2 [&_button]:min-h-[44px] sm:mt-3 sm:pt-3 sm:[&_button]:min-h-8 max-sm:[@media(max-height:500px)]:mt-1 max-sm:[@media(max-height:500px)]:pt-1">
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
                onClick={() => { setMinimizedStep(null); setIndex((i) => Math.max(0, i - 1)) }}
                aria-label="Go back to the previous tour step"
              >
                Back
              </Button>
              {isLast ? (
                <Button type="button" size="sm" className={ACTION_COLORS} onClick={() => onFinish(true)} aria-label="Finish the guided tour">
                  Finish
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className={ACTION_COLORS}
                  onClick={() => { setMinimizedStep(null); setIndex((i) => Math.min(steps.length - 1, i + 1)) }}
                  aria-label="Go to the next tour step"
                >
                  Next
                </Button>
              )}
            </div>
          </div>
          </>
          )}
        </DialogPanel>
      </div>
    </div>
  )
}
