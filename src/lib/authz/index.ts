// Public server surface of the authz module (Phase 2 design section 3.2).
//
// Everything a route needs, from one import:
//   import { requireCan, requireRole } from '@/lib/authz'
//
// permissions.ts is deliberately NOT re-exported here: it is the
// client-safe mirror and must never pull this module graph (mongodb,
// session secrets) into a client bundle. Client code imports it directly:
//   import { PERMISSIONS } from '@/lib/authz/permissions'

// decisionToHttpError arrives via the types star export below (it lives in
// types.ts for a pure, bun-testable import chain; guards re-exports it).
export * from './types'
export { resolveContext, type AuthzActor, type AuthzContext } from './context'
export { createRelations, type Relations, type GradeRowState } from './relations'
export { can } from './policies'
export {
  requireCan,
  requireRole,
  type Guarded,
  type GuardOpts,
} from './guards'
export {
  createScopes,
  professorOwnership,
  editablePeriodGuard,
  type AuthzScopes,
  type ProfessorOwnershipFilter,
  type GradeRowScope,
} from './scopes'
