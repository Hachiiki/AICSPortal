// Unit tests for the onboarding registry (onboarding plan, Phase 1).
//
// Pins the recovered-scope invariants: five state dimensions per role,
// per-role versioned specs, and the carry-forward rule (done steps stay
// done across version bumps, added dimensions start false, retired
// dimensions drop out, the current registry is always the authority).
//
// Same conventions as the authz suites: bun test, pure logic, no
// database, no environment. Run with `bun test src/lib/onboarding/`.

import { describe, expect, it } from 'bun:test'
import {
  ONBOARDING_REGISTRY,
  applyUpdates,
  carryForward,
  emptyValues,
  registryFor,
  type OnboardingRoleSpec,
  type StoredOnboardingState,
} from './registry'

const student = registryFor('student') as OnboardingRoleSpec
const faculty = registryFor('faculty') as OnboardingRoleSpec
const admin = registryFor('admin') as OnboardingRoleSpec

describe('onboarding registry shape', () => {
  it('covers all three roles', () => {
    expect(Object.keys(ONBOARDING_REGISTRY).sort()).toEqual(['admin', 'faculty', 'student'])
  })

  it('every role spec has exactly five state dimensions with unique keys', () => {
    for (const spec of [student, faculty, admin]) {
      expect(spec.dimensions).toHaveLength(5)
      const keys = spec.dimensions.map((d) => d.key)
      expect(new Set(keys).size).toBe(5)
    }
  })

  it('every dimension carries a key and a non-empty label', () => {
    for (const spec of [student, faculty, admin]) {
      for (const dim of spec.dimensions) {
        expect(dim.key.length).toBeGreaterThan(0)
        expect(dim.label.length).toBeGreaterThan(0)
      }
    }
  })

  it('every spec version is a positive integer', () => {
    for (const spec of [student, faculty, admin]) {
      expect(Number.isInteger(spec.version)).toBe(true)
      expect(spec.version).toBeGreaterThan(0)
    }
  })
})

describe('registryFor', () => {
  it('resolves the three roles', () => {
    expect(registryFor('student')).toBe(student)
    expect(registryFor('faculty')).toBe(faculty)
    expect(registryFor('admin')).toBe(admin)
  })

  it('corrupt role strings resolve to no spec (issue #67 class, fail closed)', () => {
    expect(registryFor('')).toBeUndefined()
    expect(registryFor('rogue')).toBeUndefined()
    expect(registryFor('Student')).toBeUndefined()
  })
})

describe('emptyValues', () => {
  it('every dimension starts false', () => {
    expect(emptyValues(student)).toEqual({
      password: false,
      profile: false,
      photo: false,
      tour: false,
      announcements: false,
    })
  })
})

describe('carryForward (version carry-forward)', () => {
  it('no stored doc reads as a fresh current-version state', () => {
    const state = carryForward(student, null)
    expect(state.version).toBe(student.version)
    expect(state.values).toEqual(emptyValues(student))
  })

  it('a same-version doc passes its values through', () => {
    const state = carryForward(student, {
      version: student.version,
      values: { password: true, tour: true },
    })
    expect(state.version).toBe(student.version)
    expect(state.values).toEqual({
      password: true,
      profile: false,
      photo: false,
      tour: true,
      announcements: false,
    })
  })

  it('an older-version doc keeps done steps, drops retired dimensions, starts new ones false', () => {
    // A doc written under a hypothetical v0 whose set had password plus a
    // retired 'legacyStep'; the v1 spec adds profile/photo/tour/announcements.
    const state = carryForward(student, {
      version: 0,
      values: { password: true, legacyStep: true },
    })
    expect(state.version).toBe(student.version)
    expect(state.values).toEqual({
      password: true,
      profile: false,
      photo: false,
      tour: false,
      announcements: false,
    })
  })

  it('a newer-version doc (registry rollback) normalizes to the current spec', () => {
    const state = carryForward(student, {
      version: 99,
      values: { password: true, futureStep: true },
    })
    expect(state.version).toBe(student.version)
    expect(state.values).toEqual({
      password: true,
      profile: false,
      photo: false,
      tour: false,
      announcements: false,
    })
  })

  it('non-true stored values read as not done (tolerant reader)', () => {
    // Malformed on purpose: the reader must treat anything that is not
    // strictly true as not done, and must not crash on odd shapes.
    const state = carryForward(student, {
      version: student.version,
      values: { password: 'yes', profile: 1, tour: true },
    } as unknown as StoredOnboardingState)
    expect(state.values.password).toBe(false)
    expect(state.values.profile).toBe(false)
    expect(state.values.tour).toBe(true)
  })

  it('a malformed values field reads as a fresh state, not a crash', () => {
    const state = carryForward(student, { version: student.version, values: undefined })
    expect(state.values).toEqual(emptyValues(student))
  })

  it('a role change carries only the dimensions shared with the new spec', () => {
    // A student doc read against the faculty spec: the shared keys carry
    // (password, announcements), student-only keys drop, faculty keys
    // start false.
    const state = carryForward(faculty, {
      version: student.version,
      values: { password: true, photo: true, announcements: true },
    })
    expect(state.version).toBe(faculty.version)
    expect(state.values).toEqual({
      password: true,
      profile: false,
      roster: false,
      gradebook: false,
      announcements: true,
    })
  })
})

describe('applyUpdates', () => {
  it('sets known keys and returns a new map (no mutation)', () => {
    const base = emptyValues(student)
    const values = applyUpdates(student, base, { password: true, profile: true })
    expect(values.password).toBe(true)
    expect(values.profile).toBe(true)
    expect(values.tour).toBe(false)
    expect(base.password).toBe(false)
  })

  it('drops unknown keys (the route 400s them; this is the backstop)', () => {
    const values = applyUpdates(student, emptyValues(student), {
      password: true,
      hackThePlanet: true,
    })
    expect(values).toEqual({
      password: true,
      profile: false,
      photo: false,
      tour: false,
      announcements: false,
    })
    expect('hackThePlanet' in values).toBe(false)
  })

  it('an explicit false marks a done step back to not done', () => {
    const values = applyUpdates(student, { ...emptyValues(student), password: true }, {
      password: false,
    })
    expect(values.password).toBe(false)
  })
})
