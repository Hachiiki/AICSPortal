import { expect, test } from 'bun:test'
import { parsePath, routeToPath } from './use-portal-route'

const identity = { branch: 'commonwealth', username: 'juan.santos', role: 'student' as const }
test('checklist destinations preserve the selected section and focus across reloads', () => {
  const password = { ...identity, view: 'settings' as const, section: 'security' as const, focus: 'password' as const }
  expect(routeToPath(password)).toBe('/portal/commonwealth/student/juan.santos/settings?section=security#password')
  expect(parsePath(routeToPath(password))).toEqual(password)
  const photo = { ...identity, view: 'settings' as const, section: 'profile' as const, focus: 'photo' as const }
  expect(parsePath(routeToPath(photo))).toEqual(photo)
})
test('Tasks, profile and announcements have actual contextual destinations', () => {
  expect(parsePath('/portal/commonwealth/student/juan.santos/academics?tab=tasks')).toEqual({ ...identity, view: 'academics', tab: 'tasks' })
  expect(parsePath('/portal/commonwealth/student/juan.santos/profile#profile')).toEqual({ ...identity, view: 'profile', focus: 'profile' })
  expect(parsePath('/portal/commonwealth/student/juan.santos#announcements')).toEqual({ ...identity, view: 'dashboard', focus: 'announcements' })
})
test('unknown tabs and focus targets never become executable navigation', () => {
  expect(parsePath('/portal/commonwealth/student/juan.santos/settings?section=unknown#other')).toEqual({ ...identity, view: 'settings' })
  expect(parsePath('/portal/commonwealth/student/juan.santos/academics?tab=other')).toEqual({ ...identity, view: 'academics' })
})
