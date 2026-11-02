import { describe, expect, it } from 'bun:test'
import { StudentOnboardingClient, shouldWelcomeStudent } from './student-client'

const values = { password: false, profile: false, photo: false, tour: false, announcements: false }
const response = (extra = {}) => Response.json({ ok: true, role: 'student', version: 1, values, persisted: true, preferences: { welcomeSeen: false, checklistDismissed: false, tourSkipped: false }, ...extra })

describe('student onboarding journey through its state API', () => {
  it('uses the password action receipt without writing through the revoked session', async () => {
    const writes: unknown[] = []
    const client = new StudentOnboardingClient(async (_url, init) => { if (init) writes.push(init); return response() })
    await client.load()
    client.passwordChanged(true)
    await client.retry()
    expect(client.getSnapshot().values.password).toBe(true)
    expect(client.getSnapshot().persisted).toBe(true)
    expect(writes).toHaveLength(0)
  })

  it('reports unsaved password progress when the authorized action could not persist it', async () => {
    const client = new StudentOnboardingClient(async () => response())
    await client.load()
    client.passwordChanged(false)
    expect(client.getSnapshot().values.password).toBe(true)
    expect(client.getSnapshot().persisted).toBe(false)
  })
  it('welcomes a new eligible student after portal readiness, then remembers exploration', async () => {
    const requests: unknown[] = []
    const client = new StudentOnboardingClient(async (_url, init) => { if (init?.body) requests.push(JSON.parse(String(init.body))); return response() })
    expect(shouldWelcomeStudent(client.getSnapshot(), true)).toBe(false)
    await client.load()
    expect(shouldWelcomeStudent(client.getSnapshot(), false)).toBe(false)
    expect(shouldWelcomeStudent(client.getSnapshot(), true)).toBe(true)
    await client.update({}, { welcomeSeen: true, tourSkipped: true })
    expect(shouldWelcomeStudent(client.getSnapshot(), true)).toBe(false)
    expect(client.getSnapshot().values.tour).toBe(false)
    expect(requests).toEqual([{ updates: {}, preferences: { welcomeSeen: true, tourSkipped: true } }])
  })

  it('resumes saved progress and never repeats a completed tour introduction', async () => {
    const client = new StudentOnboardingClient(async () => response({ values: { ...values, tour: true, profile: true } }))
    await client.load()
    expect(client.getSnapshot().values.profile).toBe(true)
    expect(shouldWelcomeStudent(client.getSnapshot(), true)).toBe(false)
    await client.complete('tour')
    expect(client.getSnapshot().values.profile).toBe(true)
  })

  it('hides onboarding after a failed or non-authoritative read', async () => {
    for (const fetcher of [async () => { throw new Error('offline') }, async () => response({ persisted: false }), async () => response({ role: 'faculty' })]) {
      const client = new StudentOnboardingClient(fetcher)
      await client.load()
      expect(client.getSnapshot().status).toBe('unavailable')
      expect(shouldWelcomeStudent(client.getSnapshot(), true)).toBe(false)
    }
  })

  it('keeps completion for the session after a failed save and retries the actual pending progress', async () => {
    let fail = true
    const sent: unknown[] = []
    const client = new StudentOnboardingClient(async (_url, init) => {
      if (!init) return response()
      sent.push(JSON.parse(String(init.body)))
      if (fail) throw new Error('offline')
      return response({ values: { ...values, tour: true } })
    })
    await client.load()
    await client.complete('tour')
    expect(client.getSnapshot().values.tour).toBe(true)
    expect(client.getSnapshot().persisted).toBe(false)
    fail = false
    await client.retry()
    expect(client.getSnapshot().persisted).toBe(true)
    expect(sent).toEqual([{ updates: { tour: true }, preferences: {} }, { updates: { tour: true }, preferences: {} }])
  })

  it('dismisses and restores the checklist without resetting completed tasks', async () => {
    const client = new StudentOnboardingClient(async () => response())
    await client.load()
    await client.complete('profile')
    await client.update({}, { checklistDismissed: true })
    expect(client.getSnapshot().preferences.checklistDismissed).toBe(true)
    await client.update({}, { checklistDismissed: false })
    expect(client.getSnapshot().values.profile).toBe(true)
    expect(client.getSnapshot().preferences.checklistDismissed).toBe(false)
  })
})
