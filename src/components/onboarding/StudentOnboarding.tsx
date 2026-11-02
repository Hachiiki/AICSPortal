'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Check, ChevronRight, Compass, RotateCcw, X } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { ONBOARDING_REGISTRY } from '@/lib/onboarding/registry'
import { StudentOnboardingClient, shouldWelcomeStudent, type StudentOnboardingSnapshot } from '@/lib/onboarding/student-client'
import { STUDENT_TOUR_STEPS } from '@/lib/onboarding/student-tour'
import { Button } from '@/components/ui/button'
import { DialogPanel } from '@/components/portal/DialogPanel'
import { TourOverlay } from './TourOverlay'

const ACTION = 'bg-ink text-surface hover:bg-ink hover:text-surface'
interface Journey {
  state: StudentOnboardingSnapshot
  client: StudentOnboardingClient
  start: (trigger: HTMLElement) => void
  navigate: (view: View) => void
}
const Context = createContext<Journey | null>(null)
export const useStudentOnboarding = () => useContext(Context)

/** Lives above per-view shells so route changes never restart a tour. */
export function StudentOnboardingProvider({ student, enabled, children }: { student: Student | null; enabled: boolean; children: ReactNode }) {
  const client = useMemo(() => new StudentOnboardingClient(), [student?.username, student?.branch])
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot)
  const [welcome, setWelcome] = useState(false)
  const [running, setRunning] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const offered = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const { navigate } = usePortalRoute()
  const active = enabled && !!student && (student.role ?? 'student') === 'student'

  useEffect(() => {
    if (!active) return
    void client.load()
    return () => client.dispose()
  }, [client, active])
  useEffect(() => {
    if (!offered.current && shouldWelcomeStudent(state, active)) {
      // Open after the ready portal has painted, rather than in the same
      // render that removes the post-login transition.
      const frame = requestAnimationFrame(() => {
        offered.current = true
        setWelcome(true)
        void client.update({}, { welcomeSeen: true })
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [state, active, client])
  useEffect(() => {
    if (active && student?.photoUrl && state.status === 'ready' && !state.values.photo) void client.complete('photo')
  }, [active, student?.photoUrl, state.status, state.values.photo, client])

  const navigateView = useCallback((view: View) => {
    if (!student || !['dashboard', 'academics', 'events', 'profile', 'settings', 'help'].includes(view)) return
    navigate({ view: view as 'dashboard' | 'academics' | 'events' | 'profile' | 'settings' | 'help', branch: student.branch, username: student.username, role: 'student' })
  }, [student, navigate])
  const start = useCallback((element: HTMLElement) => {
    trigger.current = element
    setWelcome(false)
    setAnnouncement('')
    void client.update({}, { welcomeSeen: true })
    setRunning(true)
  }, [client])
  const closeWelcome = () => {
    setWelcome(false)
    void client.update({}, { tourSkipped: true })
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#main-content')?.focus())
  }
  const finish = useCallback((completed: boolean) => {
    setRunning(false)
    void client.update(completed ? { tour: true } : {}, { welcomeSeen: true, tourSkipped: !completed })
    setAnnouncement(completed ? 'Guided tour completed. You can replay it from Help & Support.' : 'Guided tour closed. You can resume from Getting started or replay from Help & Support.')
    requestAnimationFrame(() => {
      const target = trigger.current?.isConnected ? trigger.current
        : document.querySelector<HTMLElement>('[data-student-onboarding-replay]') ?? document.querySelector<HTMLElement>('#main-content')
      target?.focus()
    })
  }, [client])
  const journey = active && state.status === 'ready' ? { state, client, start, navigate: navigateView } : null
  return <Context.Provider value={journey}>
    {children}
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    {active && welcome && !running && <div className="fixed inset-0 z-50 grid place-items-center bg-scrim/40 p-4">
      <DialogPanel onClose={closeWelcome} aria-labelledby="student-welcome-title" className="relative w-full max-w-md rounded-xl border border-border bg-surface p-6 text-ink shadow-xl">
        <Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Close welcome" onClick={closeWelcome}><X aria-hidden /></Button>
        <Compass className="mb-4 size-8 text-link" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Your student portal</p>
        <h2 id="student-welcome-title" className="mt-2 text-2xl font-bold tracking-tight">Welcome to AICS, {student?.firstName}.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-fg">Find your academic record, coursework and campus updates in one place. Take a short tour, or explore at your own pace.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button className={ACTION} onClick={event => start(event.currentTarget)}>Show me around</Button>
          <Button variant="outline" onClick={closeWelcome}>I&apos;ll explore on my own</Button>
        </div>
        <p className="mt-4 text-xs text-muted-fg">You can start the tour later in Getting started or Help &amp; Support.</p>
      </DialogPanel>
    </div>}
    {active && running && <TourOverlay steps={STUDENT_TOUR_STEPS} onFinish={finish} onNavigate={navigateView} />}
  </Context.Provider>
}

export function StudentGettingStarted() {
  const journey = useStudentOnboarding()
  if (!journey) return null
  const { state, client } = journey
  const dimensions = ONBOARDING_REGISTRY.student.dimensions
  const done = dimensions.filter(d => state.values[d.key]).length
  if (state.preferences.checklistDismissed || done === dimensions.length) return null
  const destinations: Record<string, View> = { password: 'settings', profile: 'profile', photo: 'settings', announcements: 'dashboard' }
  return <section aria-labelledby="getting-started-title" className="rounded-xl border border-border bg-surface p-5 text-ink shadow-sm" data-tour="student-getting-started">
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="getting-started-title" className="text-base font-semibold">Getting started</h2><p className="mt-1 text-sm text-muted-fg">A few steps to make the portal yours. You can return to this list from Help &amp; Support.</p></div>
      <Button variant="ghost" size="sm" onClick={() => void client.update({}, { checklistDismissed: true })}>Hide checklist</Button>
    </div>
    <div className="my-4 flex items-center gap-3"><progress className="h-2 w-full accent-current" value={done} max={dimensions.length} aria-label="Getting started progress" /><span className="shrink-0 text-xs text-muted-fg">{done} of {dimensions.length} complete</span></div>
    <ul className="divide-y divide-border">{dimensions.map(d => <li key={d.key} className="flex items-center gap-3 py-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border" aria-hidden>{state.values[d.key] && <Check className="size-4" />}</span>
      <span className="min-w-0 flex-1 text-sm font-medium">{d.label}{state.values[d.key] && <span className="ml-2 text-xs font-normal text-muted-fg">Complete</span>}</span>
      {!state.values[d.key] && <Button variant="ghost" size="sm" aria-label={d.key === 'tour' ? 'Start student guided tour' : d.label} onClick={event => d.key === 'tour' ? journey.start(event.currentTarget) : journey.navigate(destinations[d.key])}>{d.key === 'tour' ? 'Start tour' : 'Open'}<ChevronRight className="size-4" aria-hidden /></Button>}
    </li>)}</ul>
    {!state.persisted && <p role="status" className="mt-3 text-sm text-muted-fg">Your progress is kept for this session. <button type="button" className="font-semibold text-link underline" onClick={() => void client.retry()}>Retry saving</button></p>}
  </section>
}

export function StudentReviewAction({ dimension, children }: { dimension: 'profile' | 'announcements'; children: ReactNode }) {
  const journey = useStudentOnboarding()
  if (!journey || journey.state.values[dimension]) return null
  return <Button variant="outline" size="sm" className="mt-3" onClick={() => void journey.client.complete(dimension)}>{children}</Button>
}

export function StudentOnboardingHelp() {
  const journey = useStudentOnboarding()
  if (!journey) return null
  return <section className="rounded-xl border border-border bg-surface p-5 text-ink shadow-sm" aria-labelledby="student-tour-help-title" data-tour="student-tour-replay">
    <h2 id="student-tour-help-title" className="text-base font-semibold">Find your way around</h2>
    <p className="mt-1 text-sm text-muted-fg">Replay the student portal tour whenever you need it. Your completed Getting started steps stay saved.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button className={ACTION} data-student-onboarding-replay onClick={event => journey.start(event.currentTarget)}><RotateCcw className="size-4" aria-hidden />Replay guided tour</Button>
      <Button variant="outline" onClick={() => { void journey.client.update({}, { checklistDismissed: false }); journey.navigate('dashboard') }}>Resume Getting started</Button>
    </div>
  </section>
}
