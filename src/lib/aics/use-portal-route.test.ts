import { expect, test } from 'bun:test'
import { parsePath, routeToPath } from './use-portal-route'

const identity = { branch: 'commonwealth', username: 'juan.santos', role: 'student' as const }
test('the Notifications page survives a student reload without becoming a staff route', () => {
  const notifications = { ...identity, view: 'notifications' as const }
  const path = routeToPath(notifications)
  expect(path).toBe('/portal/commonwealth/student/juan.santos/notifications')
  expect(parsePath(path)).toEqual(notifications)
  expect(parsePath(path.replace('/student/', '/faculty/'))).toEqual({ ...identity, role: 'faculty', view: 'dashboard' })
})
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

test('task links preserve the selected task across navigation and reload', () => {
  const task = { ...identity, view: 'academics' as const, tab: 'tasks' as const, taskId: 'task-42', subjectCode: 'CS 201' }
  expect(parsePath(routeToPath(task))).toEqual(task)
  expect(routeToPath(task)).not.toBe(routeToPath({ ...task, taskId: 'task-43' }))
  expect(routeToPath(task)).toContain('subject=CS+201')
})

test('task focus is ignored outside the Tasks section', () => {
  expect(parsePath('/portal/commonwealth/student/juan.santos/academics?tab=grades&task=task-42&subject=CS201')).toEqual({ ...identity, view: 'academics', tab: 'grades' })
})
