'use client'

// Dev-only synthetic tour host (onboarding plan, Phase 2).
//
// NOT role content: every step is synthetic and says so. This host
// exists to exercise the engine against live portal surfaces plus a
// small controllable board for the degraded paths:
//
//   - the launcher rides in dev only (the mount in PortalShell gates it
//     behind NODE_ENV, and this whole module is dynamically imported
//     after that check, so a production build ships nothing of it)
//   - the board's late target mounts on a timer (B3), the volatile
//     target is removed by its own button mid-step (B4), and one step
//     targets an id that never exists (B2)
//   - cross-view steps navigate through usePortalRoute, the app's own
//     pushState navigation (C4)
//   - persistence models the Phase 1 contract the gate must observe
//     (H2): a failed read hides the launcher while the portal keeps
//     working, and a failed write never blocks the tour's completion.
//     Both calls go through the real /api/onboarding/state route; the
//     synthetic tour completing marks the registry's real 'tour'
//     dimension, fire-and-forget, charitable on failure.
//
// This file is dev-only scaffolding (cost signal S5): retiring it and
// its mount leaves no production path touched.

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePortalRoute, type PortalRoute } from '@/lib/aics/use-portal-route'
import type { View } from '@/lib/aics/types'
import { TourOverlay } from './TourOverlay'
import type { TourStep } from '@/lib/onboarding/tour/steps'

/** Legacy display ids carry no portal route; a step naming one is data
 *  this host refuses rather than crashes on. */
function isRoutableView(view: View): view is PortalRoute['view'] {
  return view !== 'login' && view !== 'subjects' && view !== 'grades' && view !== 'documents'
}

const DEV_STEPS: TourStep[] = [
  {
    id: 'dev-1',
    target: 'nav-dashboard',
    side: 'right',
    title: 'Synthetic 1: live navigation target',
    body: 'The spotlight frames a real sidebar item. No portal content is taught here; the step exercises framing, edge clamping, and keyboard focus.',
  },
  {
    id: 'dev-2',
    target: 'nav-academics',
    side: 'right',
    title: 'Synthetic 2: second nav target',
    body: 'The same live surface at a different position; the card follows the flip and clamp rules near the viewport edge.',
  },
  {
    id: 'dev-3',
    target: 'board-late-target',
    side: 'top',
    title: 'Synthetic 3: a target that mounts late',
    body: 'The target element appears shortly after this step opens. The engine waits without painting a wrong position, then frames it.',
  },
  {
    id: 'dev-4',
    target: 'board-volatile-target',
    side: 'top',
    title: 'Synthetic 4: a removable target',
    body: "Click 'Remove volatile target' in the dev board while this step is open: the spotlight releases, the card re-centers, and the step stays operable.",
  },
  {
    id: 'dev-5',
    target: 'events-page',
    view: 'events',
    side: 'bottom',
    title: 'Synthetic 5: crossing views',
    body: 'The engine navigates through the app\u2019s own pushState navigation, waits for the incoming view to mount, then frames it.',
  },
  {
    id: 'dev-6',
    target: 'topbar-notifications',
    side: 'bottom',
    title: 'Synthetic 6: topbar target',
    body: 'A sticky-topbar target: the card flips below the ring.',
  },
  {
    id: 'dev-7',
    target: 'board-never-present',
    maxWaitMs: 1500,
    title: 'Synthetic 7: target absent',
    body: "This step's target id never exists. The engine waits out the step budget, then skips forward with a live announcement.",
  },
  {
    id: 'dev-8',
    target: 'nav-help',
    side: 'right',
    title: 'Synthetic 8: last step',
    body: 'The final synthetic step points at Help & Support, where the real design keeps tour replay. Finishing here completes the tour.',
  },
]

export function OnboardingDev() {
  const [visible, setVisible] = useState(false)
  const [running, setRunning] = useState(false)
  const [endAnnouncement, setEndAnnouncement] = useState('')
  const [lateTarget, setLateTarget] = useState(false)
  const [volatileTarget, setVolatileTarget] = useState(false)
  const lateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const launcherRef = useRef<HTMLButtonElement | null>(null)
  const wasRunningRef = useRef(false)
  const { route, navigate } = usePortalRoute()

  // Latest route through a ref so onNavigate keeps a stable identity: the
  // route object from usePortalRoute is new every render, and an unstable
  // callback would re-trigger the engine's per-step effect (and the
  // board arming) on every host render.
  const routeRef = useRef(route)
  useEffect(() => {
    routeRef.current = route
  })

  // Read on mount (H2 model): the launcher is an onboarding surface, so
  // a failed read hides it while the portal keeps working. The Phase 1
  // route itself answers persisted:false on a DB failure and stays 200,
  // which still shows the surface; only a transport-level failure hides.
  useEffect(() => {
    let cancelled = false
    fetch('/api/onboarding/state')
      .then((res) => {
        if (!cancelled) setVisible(res.ok)
      })
      .catch(() => {
        if (!cancelled) setVisible(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(
    () => () => {
      if (lateTimerRef.current !== null) clearTimeout(lateTimerRef.current)
    },
    []
  )

  // The launcher is the tour's own trigger and intentionally unmounts
  // while the tour runs, so the DialogPanel restore (which captured the
  // trigger node at open) lands on a detached node when the overlay
  // unmounts. The host owns the re-focus of its remounted launcher.
  useEffect(() => {
    if (wasRunningRef.current && !running) launcherRef.current?.focus()
    wasRunningRef.current = running
  }, [running])

  const onStepChange = useCallback((step: TourStep) => {
    setLateTarget(false)
    setVolatileTarget(false)
    if (step.id === 'dev-3') {
      // B3: the late target mounts on its own timer, deterministically.
      if (lateTimerRef.current !== null) clearTimeout(lateTimerRef.current)
      lateTimerRef.current = setTimeout(() => {
        lateTimerRef.current = null
        setLateTarget(true)
      }, 800)
    }
    if (step.id === 'dev-4') setVolatileTarget(true)
  }, [])

  const onNavigate = useCallback(
    (view: View) => {
      const r = routeRef.current
      if (r.view === 'login' || !isRoutableView(view)) return
      navigate({ view, branch: r.branch, username: r.username, role: r.role })
    },
    [navigate]
  )

  const onFinish = useCallback((completed: boolean) => {
    setRunning(false)
    setLateTarget(false)
    setVolatileTarget(false)
    setEndAnnouncement(completed ? 'Guided tour completed.' : 'Guided tour skipped.')
    if (!completed) return
    // H2 model: completion is charitable. The write is fire-and-forget
    // through the real Phase 1 route (marking the registry's 'tour'
    // dimension); a failure never blocks or rewinds the tour.
    void fetch('/api/onboarding/state', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ updates: { tour: true } }),
    }).catch(() => {})
  }, [])

  return (
    <>
      {/* Host-level end announcement (D3): the overlay's live region
          unmounts with the overlay, so the completed/skipped sentence
          lives here where it survives the unmount. */}
      <p className="sr-only" role="status" aria-live="polite">
        {endAnnouncement}
      </p>

      {visible && !running && (
        <button
          type="button"
          ref={launcherRef}
          data-tour="dev-tour-launcher"
          onClick={() => setRunning(true)}
          className="fixed bottom-4 right-4 z-30 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink shadow-lg hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="mr-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
            Dev
          </span>
          Start guided tour
        </button>
      )}

      {running && (
        <div
          data-testid="dev-tour-board"
          className="fixed bottom-4 left-4 z-40 w-60 rounded-xl border border-border bg-surface p-3 text-ink shadow-lg"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-fg">
            Dev synthetic targets
          </p>
          <div className="mt-2 space-y-2 text-xs">
            {lateTarget && (
              <div
                data-tour="board-late-target"
                className="rounded-md border border-border bg-surface-2 px-2 py-3 text-center font-medium"
              >
                Late-mounted target
              </div>
            )}
            {volatileTarget && (
              <div
                data-tour="board-volatile-target"
                className="rounded-md border border-border bg-surface-2 px-2 py-3 text-center font-medium"
              >
                Volatile target
              </div>
            )}
            {volatileTarget && (
              <button
                type="button"
                data-testid="remove-volatile-target"
                onClick={() => setVolatileTarget(false)}
                className="w-full rounded-md border border-border px-2 py-1.5 font-medium hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Remove volatile target
              </button>
            )}
          </div>
        </div>
      )}

      {running && (
        <TourOverlay
          steps={DEV_STEPS}
          onFinish={onFinish}
          onNavigate={onNavigate}
          onStepChange={onStepChange}
        />
      )}
    </>
  )
}
