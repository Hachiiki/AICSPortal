import { ONBOARDING_REGISTRY, emptyValues, type OnboardingValues } from './registry'
import { onboardingPreferences, type OnboardingPreferences } from './preferences'

export interface StudentOnboardingSnapshot {
  status: 'loading' | 'ready' | 'unavailable'
  values: OnboardingValues
  preferences: OnboardingPreferences
  persisted: boolean
}
type Transport = (url: string, init?: RequestInit) => Promise<Response>
const spec = ONBOARDING_REGISTRY.student

export function shouldWelcomeStudent(state: StudentOnboardingSnapshot, portalReady: boolean) {
  return portalReady && state.status === 'ready' && !state.preferences.welcomeSeen && !state.values.tour
}

/** One authenticated student's display state; never an authorization source. */
export class StudentOnboardingClient {
  private snapshot: StudentOnboardingSnapshot = { status: 'loading', values: emptyValues(spec), preferences: onboardingPreferences(null), persisted: false }
  private listeners = new Set<() => void>()
  private generation = 0
  private queue = Promise.resolve()
  private pendingValues: OnboardingValues = {}
  private pendingPreferences: Partial<OnboardingPreferences> = {}
  constructor(private transport: Transport = (url, init) => fetch(url, init)) {}
  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private publish(patch: Partial<StudentOnboardingSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    for (const listener of this.listeners) listener()
  }
  dispose() { this.generation++ }
  async load() {
    const generation = ++this.generation
    try {
      const res = await this.transport('/api/onboarding/state')
      const body = await res.json()
      if (generation !== this.generation) return
      if (!res.ok || body.ok !== true || body.role !== 'student' || body.version !== spec.version || body.persisted !== true
        || !spec.dimensions.every(d => typeof body.values?.[d.key] === 'boolean')) throw new Error('State unavailable')
      this.publish({ status: 'ready', values: Object.fromEntries(spec.dimensions.map(d => [d.key, body.values[d.key]])), preferences: onboardingPreferences(body.preferences), persisted: true })
    } catch {
      if (generation === this.generation) this.publish({ status: 'unavailable' })
    }
  }
  complete(key: string) {
    if (this.snapshot.values[key]) return this.queue
    return this.update({ [key]: true })
  }
  passwordChanged(persisted: boolean) {
    if (this.snapshot.status !== 'ready') return
    if (!persisted) this.pendingValues.password = true
    this.publish({ values: { ...this.snapshot.values, password: true }, persisted: persisted && !Object.keys(this.pendingValues).length && !Object.keys(this.pendingPreferences).length })
  }
  update(updates: OnboardingValues = {}, preferences: Partial<OnboardingPreferences> = {}) {
    if (this.snapshot.status !== 'ready') return Promise.resolve()
    const allowed = Object.fromEntries(Object.entries(updates).filter(([key]) => spec.dimensions.some(d => d.key === key)))
    Object.assign(this.pendingValues, allowed)
    Object.assign(this.pendingPreferences, preferences)
    this.publish({ values: { ...this.snapshot.values, ...allowed }, preferences: { ...this.snapshot.preferences, ...preferences } })
    return this.retry()
  }
  retry() {
    const generation = this.generation
    this.queue = this.queue.then(async () => {
      if (generation !== this.generation || this.snapshot.status !== 'ready') return
      const updates = { ...this.pendingValues }, preferences = { ...this.pendingPreferences }
      if (!Object.keys(updates).length && !Object.keys(preferences).length) return
      try {
        const res = await this.transport('/api/onboarding/state', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ updates, preferences }) })
        const body = await res.json()
        if (generation !== this.generation) return
        if (!res.ok || body.ok !== true || body.role !== 'student' || body.persisted !== true) throw new Error('Save unavailable')
        for (const [key, value] of Object.entries(updates)) if (this.pendingValues[key] === value) delete this.pendingValues[key]
        for (const key of Object.keys(preferences) as (keyof OnboardingPreferences)[]) if (this.pendingPreferences[key] === preferences[key]) delete this.pendingPreferences[key]
        this.publish({ persisted: true })
      } catch {
        if (generation === this.generation) this.publish({ persisted: false })
      }
    })
    return this.queue
  }
}
