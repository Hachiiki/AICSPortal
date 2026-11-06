'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Check, ChevronRight, Compass, RotateCcw, X } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import { usePortalRoute } from '@/lib/aics/use-portal-route'
import { ONBOARDING_REGISTRY } from '@/lib/onboarding/registry'
import { StudentOnboardingClient, shouldWelcomeStudent, getStudentTourUpdate, type StudentOnboardingSnapshot } from '@/lib/onboarding/student-client'
import { STUDENT_TOUR_STEPS, TASKS_TOUR_STEPS } from '@/lib/onboarding/student-tour'
import { Button } from '@/components/ui/button'
import { DialogPanel } from '@/components/portal/DialogPanel'
import { TourOverlay } from './TourOverlay'

const ACTION = 'bg-ink text-surface hover:bg-ink hover:text-surface'
interface Journey {
  state: StudentOnboardingSnapshot
  client: StudentOnboardingClient
  start: (trigger: HTMLElement) => void
  startTasks: (trigger: HTMLElement) => void
  busy: boolean
  openChecklistItem: (key: string) => void
  navigate: (view: View) => void
}
const Context = createContext<Journey | null>(null)
export const useStudentOnboarding = () => useContext(Context)

/** Lives above per-view shells so route changes never restart a tour. */
export function StudentOnboardingProvider({ student, enabled, children }: { student: Student | null; enabled: boolean; children: ReactNode }) {
  const client = useMemo(() => new StudentOnboardingClient(), [student?.username, student?.branch])
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot)
  const [welcome, setWelcome] = useState(false)
  const [running, setRunning] = useState<'overview' | 'tasks' | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const offered = useRef(false)
  const trigger = useRef<HTMLElement | null>(null)
  const { navigate, route } = usePortalRoute()
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
    if (running) return
    trigger.current = element
    setWelcome(false)
    setAnnouncement('')
    void client.update({}, { welcomeSeen: true })
    setRunning('overview')
  }, [client, running])
  const startTasks = useCallback((element: HTMLElement) => {
    if (running || welcome || !student) return
    trigger.current = element
    setAnnouncement('')
    void client.update({}, { tasksGuideSeen: true })
    navigate({ view: 'academics', tab: 'tasks', branch: student.branch, username: student.username, role: 'student' })
    setRunning('tasks')
  }, [client, running, welcome, student, navigate])
  const openChecklistItem = useCallback((key: string) => {
    if (!student) return
    const identity = { branch: student.branch, username: student.username, role: 'student' as const }
    if (key === 'password') navigate({ ...identity, view: 'settings', section: 'security', focus: 'password' })
    if (key === 'photo') navigate({ ...identity, view: 'settings', section: 'profile', focus: 'photo' })
    if (key === 'profile') navigate({ ...identity, view: 'profile', focus: 'profile' })
    if (key === 'announcements') navigate({ ...identity, view: 'dashboard', focus: 'announcements' })
  }, [student, navigate])
  const closeWelcome = () => {
    setWelcome(false)
    void client.update({}, { tourSkipped: true })
    requestAnimationFrame(() => document.querySelector<HTMLElement>('#main-content')?.focus())
  }
  const finish = useCallback((completed: boolean) => {
    setRunning(null)
    if (running === 'tasks') {
      void client.tasksGuideFinished(completed)
      setAnnouncement(completed ? 'Tasks guide completed. Replay it from the Tasks tab anytime.' : 'Tasks guide closed. Replay it from the Tasks tab anytime.')
    } else {
      void client.update(completed ? { tour: true } : {}, { welcomeSeen: true, tourSkipped: !completed })
      setAnnouncement(completed ? 'Guided tour completed. You can replay it from Help & Support.' : 'Guided tour closed. You can resume from Getting started or replay from Help & Support.')
    }
    requestAnimationFrame(() => {
      const target = trigger.current?.isConnected ? trigger.current
        : document.querySelector<HTMLElement>(running === 'tasks' ? '[data-tasks-guide-replay]' : '[data-student-onboarding-replay]') ?? document.querySelector<HTMLElement>('#main-content')
      target?.focus()
    })
  }, [client, running])
  const tasksRoute = route.view === 'academics' && route.tab === 'tasks'
  useEffect(() => {
    if (running !== 'tasks' || tasksRoute) return
    const frame = requestAnimationFrame(() => finish(false))
    return () => cancelAnimationFrame(frame)
  }, [running, tasksRoute, finish])
  const journey = active && state.status === 'ready' ? { state, client, start, startTasks, busy: welcome || running !== null, openChecklistItem, navigate: navigateView } : null
  const tourUpdate = getStudentTourUpdate(state)
  return <Context.Provider value={journey}>
    {children}
    <p className="sr-only" role="status" aria-live="polite">{announcement || (tourUpdate.pending ? 'A student tour update is available in Help & Support.' : '')}</p>
    {active && welcome && !running && <div className="fixed inset-0 z-50 grid place-items-center bg-scrim/40 p-4">
      <DialogPanel onClose={closeWelcome} aria-labelledby="student-welcome-title" className="relative w-full max-w-md max-h-[calc(100dvh-32px)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface p-5 sm:p-6 text-ink shadow-xl">
        <Button variant="ghost" size="icon" className="absolute right-3 top-3" aria-label="Close welcome" onClick={closeWelcome}><X aria-hidden /></Button>
        <Compass className="mb-4 size-8 text-link" aria-hidden />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Your student portal</p>
        <h2 id="student-welcome-title" className="mt-2 text-2xl font-bold tracking-tight">Welcome to AICS, {student?.firstName}.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-fg">Find your academic record, coursework and campus updates in one place. Take a short tour, or explore at your own pace.</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button className={ACTION} onClick={event => start(event.currentTarget)}>Show me around</Button>
          <Button variant="outline" onClick={closeWelcome}>I&apos;ll explore on my own</Button>
        </div>
        <p className="mt-4 text-xs text-muted-fg">Use Next and Back to move through the tour, then Finish on the last step. Skip or press Escape anytime. Replay later from Help &amp; Support.</p>
      </DialogPanel>
    </div>}
    {active && running && <TourOverlay key={running} steps={running === 'tasks' ? TASKS_TOUR_STEPS : STUDENT_TOUR_STEPS} onFinish={finish} onNavigate={running === 'overview' ? navigateView : undefined} />}
  </Context.Provider>
}

export function StudentGettingStarted() {
  const [expanded, setExpanded] = useState(false)
  const journey = useStudentOnboarding()
  if (!journey) return null
  const { state, client } = journey
  const dimensions = ONBOARDING_REGISTRY.student.dimensions
  const done = dimensions.filter(d => state.values[d.key]).length
  if (state.preferences.checklistDismissed || done === dimensions.length) return null
  return <section aria-labelledby="getting-started-title" className="rounded-xl border border-border bg-surface p-5 text-ink shadow-sm" data-tour="student-getting-started">
    <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-2 sm:gap-4">
      <div><h2 id="getting-started-title" className="text-base font-semibold">Getting started</h2><p className="mt-1 text-sm text-muted-fg">A few steps to make the portal yours. You can return to this list from Help &amp; Support.</p></div>
      <Button variant="ghost" size="sm" className="min-h-11 sm:min-h-8" onClick={() => void client.update({}, { checklistDismissed: true })}>Hide checklist</Button>
    </div>
    <div className="my-4 flex items-center gap-3"><progress className="h-2 w-full accent-current" value={done} max={dimensions.length} aria-label="Getting started progress" /><span className="shrink-0 text-xs text-muted-fg">{done} of {dimensions.length} complete</span></div>
    <button type="button" aria-expanded={expanded} aria-controls="student-checklist-items" onClick={() => setExpanded(!expanded)} className="sm:hidden mb-1 flex min-h-11 w-full items-center justify-between rounded-lg border border-border px-3 text-sm font-semibold text-link">{expanded ? 'Collapse setup steps' : 'Show setup steps'}<ChevronRight className={expanded ? 'size-4 -rotate-90' : 'size-4 rotate-90'} aria-hidden /></button>
    <ul id="student-checklist-items" className={expanded ? 'divide-y divide-border' : 'hidden sm:block divide-y divide-border'}>{dimensions.map(d => <li key={d.key} className="flex items-center gap-3 py-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border" aria-hidden>{state.values[d.key] && <Check className="size-4" />}</span>
      <span className="min-w-0 flex-1 text-sm font-medium">{d.label}{state.values[d.key] && <span className="ml-2 text-xs font-normal text-muted-fg">Complete</span>}</span>
      {!state.values[d.key] && <Button variant="ghost" size="sm" aria-label={d.key === 'tour' ? 'Start student guided tour' : d.label} onClick={event => d.key === 'tour' ? journey.start(event.currentTarget) : journey.openChecklistItem(d.key)}>{d.key === 'tour' ? 'Start tour' : 'Open'}<ChevronRight className="size-4" aria-hidden /></Button>}
    </li>)}</ul>
    {!state.persisted && <p role="status" className="mt-3 text-sm text-muted-fg">Your progress is kept for this session. <button type="button" className="font-semibold text-link underline" onClick={() => void client.retry()}>Retry saving</button></p>}
  </section>
}

export function StudentTasksGuide() {
  const journey = useStudentOnboarding()
  if (!journey) return null
  const offer = !journey.state.preferences.tasksGuideSeen && !journey.busy
  return <section aria-label="Tasks guide" data-tour="tasks-guide-entry" className={offer ? 'rounded-xl border border-border bg-surface p-4 text-ink' : 'flex justify-end'}>
    {offer && <><h3 className="text-sm font-semibold">Want a quick tour of Tasks?</h3><p className="mt-1 text-sm text-muted-fg">Find filters, deadlines and submission status. You can explore on your own or take a short guide.</p></>}
    <div className={offer ? 'mt-3 flex flex-wrap gap-2' : 'flex gap-2'}>
      <Button variant={offer ? 'default' : 'outline'} className={offer ? ACTION : undefined} size="sm" disabled={journey.busy} data-tasks-guide-replay onClick={event => journey.startTasks(event.currentTarget)}>{offer ? 'Show Tasks guide' : 'Replay Tasks guide'}</Button>
      {offer && <Button variant="ghost" size="sm" onClick={() => void journey.client.tasksGuideFinished(false)}>Not now</Button>}
    </div>
  </section>
}

export function StudentOnboardingHelp() {
  const journey = useStudentOnboarding()
  if (!journey) return null
  return <section className="rounded-xl border border-border bg-surface p-5 text-ink shadow-sm" aria-labelledby="student-tour-help-title" data-tour="student-tour-replay">
    <StudentTourUpdateNotice journey={journey} />
    <h2 id="student-tour-help-title" className="text-base font-semibold">Find your way around</h2>
    <p className="mt-1 text-sm text-muted-fg">Replay the student portal tour whenever you need it. Your completed Getting started steps stay saved.</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button className={ACTION} data-student-onboarding-replay onClick={event => journey.start(event.currentTarget)}><RotateCcw className="size-4" aria-hidden />Replay guided tour</Button>
      <Button variant="outline" onClick={() => { void journey.client.update({}, { checklistDismissed: false }); journey.navigate('dashboard') }}>Resume Getting started</Button>
    </div>
  </section>
}

function StudentTourUpdateNotice({ journey }: { journey: Journey }) {
  const update = getStudentTourUpdate(journey.state)
  useEffect(() => {
    if (update.pending) void journey.client.update({}, { tourNoticeReadVersion: update.version })
  }, [journey.client, update.pending, update.version])
  if (!update.visible) return null
  return <div className="mb-5 rounded-lg border border-border bg-surface-2 p-4" role="region" aria-labelledby="student-tour-update-title">
    <p className="sr-only" role="status" aria-live="polite">{update.pending ? 'Student tour update available.' : 'Student tour update marked as read. Replay remains optional.'}</p>
    <h3 id="student-tour-update-title" className="font-semibold text-ink">Your student guides have been updated</h3>
    <p className="mt-2 text-sm text-muted-fg">The portal tour includes a separate Tasks guide for filters, deadlines and submission status. Your completed Getting started steps stay saved. Replay either guide whenever you need it.</p>
    <Button variant="outline" size="sm" className="mt-3" onClick={() => void journey.client.update({}, { tourNoticeReadVersion: update.version, tourNoticeDismissedVersion: update.version })}>Dismiss update</Button>
    {!journey.state.persisted && <p role="status" className="mt-2 text-sm text-muted-fg">Your choice is kept for this session. <button type="button" className="text-link underline" onClick={() => void journey.client.retry()}>Retry saving</button></p>}
  </div>
}
