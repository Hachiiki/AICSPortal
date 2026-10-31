// Unit tests for the client-safe permission mirror (plan P3: bun test).
// ID uniqueness, kind.action shape, and an import-lint proving the module
// never pulls server code into a client bundle.

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PERMISSIONS, type PermissionId } from './permissions'

const ids: PermissionId[] = Object.values(PERMISSIONS)

describe('permissions mirror', () => {
  it('IDs are unique', () => {
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('IDs follow the resourceKind.action convention', () => {
    // Kinds may themselves be dotted (announcement.reads, grade.releaseQueue,
    // ...), so an ID is two or more dot-separated lowercase-initial segments.
    for (const id of ids) {
      expect(id).toMatch(/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/)
    }
  })

  it('covers the faculty/admin UI surfaces the nav gates', () => {
    // The nav-relevant set from the design examples plus the task board.
    expect(PERMISSIONS.manageAnnouncements).toBe('announcement.create')
    expect(PERMISSIONS.encodeGrades).toBe('grade.period.update')
    expect(PERMISSIONS.postTasks).toBe('task.section.create')
    expect(PERMISSIONS.viewReleaseQueue).toBe('grade.releaseQueue.read')
    expect(PERMISSIONS.takeAttendance).toBe('attendance.update')
  })

  it('import-lint: the module source has no imports and no server references', () => {
    const src = readFileSync(fileURLToPath(new URL('./permissions.ts', import.meta.url)), 'utf8')
    // No import statements at all (pure constants module).
    expect(src).not.toMatch(/^import\s/m)
    expect(src).not.toMatch(/^export\s+.*from\s/m)
    // No server module references anywhere.
    expect(src).not.toContain('@/lib/mongodb')
    expect(src).not.toContain('@/lib/session')
    expect(src).not.toContain('@/lib/authz')
    expect(src).not.toContain('server-only')
  })
})
