// The authorization decision table (Phase 2 design section 4.4).
//
// Pure logic over resolved attributes: every database read goes through the
// injected Relations, which is what makes this table unit-testable with
// fakes. The table encodes the CURRENT live behavior of every route in the
// 33-file swap scope (phase-3-plan section 2.3), with one LEGACY marker per
// approved behavior fix naming the stage-3 commit that flips it. Stage 2
// swaps routes onto this table with zero golden movement; stage 3 flips the
// LEGACY branches one finding per commit.
//
// Conventions:
// - Role checks read ctx.actor.role, the DB value (fixes the M2 stale-role
//   class by construction; corrupt role strings fail every equality).
// - branch on write resources is the CLIENT-CLAIMED branch; parity is
//   claimed-vs-actor (DB), except where a comment says the route keeps a
//   JWT-vs-claimed quirk inline.
// - Lookup-dependent outcomes (404-before-gate orderings, per-row envelope
//   reasons, partial-success drops) stay in the routes during stage 2; the
//   comments below say so explicitly.

import { allow, deny, type Action, type AuthzDecision, type AuthzResource } from './types'
import type { AuthzContext } from './context'
import type { Relations } from './relations'

export async function can(
  ctx: AuthzContext,
  rel: Relations,
  resource: AuthzResource,
  action: Action
): Promise<AuthzDecision> {
  switch (resource.kind) {
    // -----------------------------------------------------------------
    // Student surface
    // -----------------------------------------------------------------
    case 'student.profile': {
      if (action === 'read') {
        // Stage 2 (C2.2) keeps the route's lookup-first ordering: the 404
        // fires before this gate (L1 oracle), so can() runs only for an
        // existing student. Cross-branch staff is 403 'Forbidden' today.
        // FIX-L1 (C3.8) reorders authz-before-existence and masks.
        if (resource.username === ctx.actor.username) return allow()
        if (ctx.actor.role !== 'faculty' && ctx.actor.role !== 'admin')
          return deny('notOwner', 'Forbidden.')
        if (!(await rel.sameBranchUsername(resource.username)))
          return deny('notOwner', 'Forbidden.')
        return allow()
      }
      if (action === 'update') {
        // student/update: self or admin (DB role after the C2.2 M2 flip).
        // The admin path's target 404 / branch-mismatch checks stay in the
        // route (they need the fetched target doc).
        if (resource.username === ctx.actor.username) return allow()
        if (ctx.actor.role !== 'admin') return deny('notOwner', 'Forbidden.')
        return allow()
      }
      return deny('role', 'Not supported.')
    }

    case 'student.export': {
      if (action !== 'read') return deny('role', 'Not supported.')
      if (resource.username !== ctx.actor.username) return deny('notOwner', 'Forbidden.')
      return allow()
    }

    case 'student.finances': {
      if (action !== 'read') return deny('role', 'Not supported.')
      // Enrollment is self-only; staff denied by design (D2-adjacent pin).
      if (resource.username !== ctx.actor.username) return deny('notOwner', 'Forbidden.')
      return allow()
    }

    // -----------------------------------------------------------------
    // Grades
    // -----------------------------------------------------------------
    case 'grade.submit': {
      if (action !== 'submit') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
      if (resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      // FIX-C1 (C3.1, issue #57): only the subject's teaching faculty may
      // submit its grades. The load query is requireTeachingFaculty's: a
      // name match over professor-of-record rows under the actor's current
      // term, so a co-teacher enumerated on any row passes. The write scope
      // (subjectRows) carries the same professor key, so the filter is
      // professor-scoped even if this gate is bypassed.
      if (!(await rel.teachesSubject(resource.subjectCode)))
        return deny('notAssigned', 'Subject is not in your current teaching load.')
      return allow()
    }

    case 'grade.period': {
      if (action !== 'update' && action !== 'withdraw') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
      // Route-level parity from grades/update: the DB performer branch must
      // equal the session's JWT branch claim. Encoded per row here; a stale
      // claim denies every row (unpinned by goldens, deny outcome kept).
      if (ctx.claims.branch !== ctx.actor.branch) return deny('branch', 'Branch mismatch')
      // Per-row claimed branch (reason 'Branch mismatch' in the 207 envelope).
      if (ctx.actor.branch && resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      const st = await rel.gradeRowState({
        studentUsername: resource.studentUsername,
        subjectCode: resource.subjectCode,
        branch: resource.branch,
        term: resource.term,
      })
      if (!st) return deny('notFound', 'Not found')
      // FIX-H1b (C3.2, issue #59): the professor-of-record check is
      // unconditional — a missing fullName fails closed instead of
      // skipping the check entirely.
      if (!ctx.actor.fullName || st.professor !== ctx.actor.fullName)
        return deny('notAssigned', 'Not your section')
      // FIX-H1a (C3.3, issue #58): the grade write state machine is
      // forward-only: '' / draft -> submitted -> released. Encoding
      // (update) is allowed while the touched period is '' or 'draft'; a
      // submitted period is withdrawable by the teaching faculty (audited
      // as action 'withdraw'); a released period is immutable to faculty —
      // correction is the admin unrelease path (grades/release, action
      // 'unrelease'), also audited.
      const periodStatus = st.statuses[resource.period]
      if (action === 'withdraw') {
        if (periodStatus !== 'submitted')
          return deny('state', 'Only submitted grades can be withdrawn.')
        return allow()
      }
      if (periodStatus === 'released')
        return deny('state', 'Released grades are locked. Contact an admin to unrelease.')
      if (periodStatus === 'submitted')
        return deny('state', 'Submitted grades are locked. Withdraw to edit.')
      return allow()
    }

    case 'grade.releaseQueue': {
      if (ctx.actor.role !== 'admin') return deny('role', 'Unauthorized: admin only')
      if (action !== 'read' && action !== 'release' && action !== 'unrelease')
        return deny('role', 'Not supported.')
      // POST branch parity: claimed body branch vs the DB admin branch.
      // FIX-H1a (C3.3): 'unrelease' is the admin correction path for
      // released periods (released -> submitted, audited) — same admin
      // role and same-branch parity as 'release' (issue #58).
      if (action !== 'read' && resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      return allow()
    }

    case 'grade.audits': {
      if (action !== 'read') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty' && ctx.actor.role !== 'admin')
        return deny('role', 'Unauthorized: faculty or admin only')
      // LEGACY(M1): no teaching-load scoping — any same-branch faculty reads
      // the whole branch's grade-change history. C3.5 scopes faculty reads
      // to professor-of-record subjects; admin keeps the branch (issue #61).
      return allow()
    }

    // -----------------------------------------------------------------
    // Tasks
    // -----------------------------------------------------------------
    case 'task.list': {
      if (action !== 'read') return deny('role', 'Not supported.')
      // tasks GET: self or same-branch staff. The route keeps its
      // lookup-first ordering (404 before the staff gate, L1 pattern) and
      // its student.branch vs claims.branch comparison inline.
      if (resource.studentUsername === ctx.actor.username) return allow()
      if (ctx.actor.role === 'faculty' || ctx.actor.role === 'admin') return allow()
      return deny('notOwner', 'Forbidden.')
    }

    case 'task.board': {
      if (action !== 'read') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty' && ctx.actor.role !== 'admin')
        return deny('role', 'Unauthorized: faculty or admin only')
      return allow()
    }

    case 'task.section': {
      if (action !== 'create' && action !== 'update' && action !== 'close' && action !== 'read')
        return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
      if (resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      // requireTeachingFaculty semantics: the load check always uses the
      // actor's CURRENT term (tasks stamp the term from the faculty doc).
      if (!(await rel.teachesSubject(resource.subjectCode)))
        return deny('notAssigned', 'Subject is not in your current teaching load.')
      return allow()
    }

    case 'task': {
      if (action === 'submit') {
        // Ownership lives inside the route's atomic update filter
        // ({studentUsername: session.username, ...}) — the strongest
        // pattern in the repo, preserved by scope fragments. Any authed
        // actor passes; the filter self-scopes.
        return allow()
      }
      if (action === 'grade') {
        if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
        // The route guards with the FETCHED task's subjectCode under the
        // current-term load (past-term tasks gradeable under a current-term
        // load — preserved, not a finding). The optional body branch
        // parity check stays in the route.
        if (!resource.subjectCode) return deny('notAssigned', 'Subject is not in your current teaching load.')
        if (!(await rel.teachesSubject(resource.subjectCode)))
          return deny('notAssigned', 'Subject is not in your current teaching load.')
        return allow()
      }
      return deny('role', 'Not supported.')
    }

    // -----------------------------------------------------------------
    // Attendance
    // -----------------------------------------------------------------
    case 'attendance': {
      if (action === 'read') {
        if (ctx.actor.role !== 'faculty' && ctx.actor.role !== 'admin')
          return deny('role', 'Unauthorized: faculty or admin only')
        // FIX-H2 (C3.4, issue #60): faculty reads are load-scoped — the
        // section must be in the caller's teaching load (co-taught sections
        // pass: the load query is the name match over professor-of-record
        // rows). Admin keeps the branch-wide read, and the read path stays
        // tolerant of historical off-roster usernames in stored records.
        if (ctx.actor.role === 'faculty' && !(await rel.teachesSection(resource.sectionKey)))
          return deny('notAssigned', 'You do not teach this section.')
        return allow()
      }
      if (action === 'update') {
        if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
        // The route keeps the L2 quirk inline: claimed branch vs the JWT
        // branch returns 400 (not this 403) until FIX-L2 (C3.9) deletes it.
        // This parity check is the DB-side twin the route runs after.
        if (resource.branch !== undefined && resource.branch !== ctx.actor.branch)
          return deny('branch', 'Branch mismatch')
        // FIX-H2 (C3.4, issue #60): the section must be in the caller's
        // teaching load — any same-branch faculty can no longer read or
        // overwrite another faculty's sections. Record keys are
        // roster-validated in the route.
        if (!(await rel.teachesSection(resource.sectionKey)))
          return deny('notAssigned', 'You do not teach this section.')
        return allow()
      }
      return deny('role', 'Not supported.')
    }

    // -----------------------------------------------------------------
    // Materials
    // -----------------------------------------------------------------
    case 'material.list': {
      if (action !== 'read') return deny('role', 'Not supported.')
      // Admin excluded by design; the route keeps its self-username check,
      // 404, and user.branch vs claims.branch comparison inline.
      if (ctx.actor.role !== 'student' && ctx.actor.role !== 'faculty')
        return deny('role', 'Unauthorized: student or faculty only')
      return allow()
    }

    case 'material.upload': {
      if (action !== 'create' && action !== 'signUpload') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
      if (resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      if (!(await rel.teachesSubject(resource.subjectCode)))
        return deny('notAssigned', 'Subject is not in your current teaching load.')
      return allow()
    }

    case 'material': {
      if (action !== 'delete') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
      // Delete is by teaching load, not uploader (D3 preserved). The route
      // guards with the fetched doc's subjectCode under the current-term
      // load and re-asserts {_id, branch} in the delete filter.
      if (!resource.subjectCode) return deny('notAssigned', 'Subject is not in your current teaching load.')
      if (!(await rel.teachesSubject(resource.subjectCode)))
        return deny('notAssigned', 'Subject is not in your current teaching load.')
      return allow()
    }

    // -----------------------------------------------------------------
    // Announcements
    // -----------------------------------------------------------------
    case 'announcement': {
      if (action === 'read') return allow() // any authed reader
      if (action !== 'create' && action !== 'update' && action !== 'delete')
        return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'admin') return deny('role', 'Unauthorized: admin only')
      // Cross-branch admin writes die here (claimed body branch vs DB
      // branch); same-branch writes stamp performer.branch in the filters.
      if (resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      return allow()
    }

    case 'announcement.reads': {
      if (action !== 'markRead' && action !== 'delete') return deny('role', 'Not supported.')
      // Self-only via the route's session-stamped filter keys
      // ({branch, username, announcementId}); the L4 ids cap is validation
      // and stays in the route until FIX-L4 (C3.11).
      return allow()
    }

    // -----------------------------------------------------------------
    // Notifications
    // -----------------------------------------------------------------
    case 'notification.inbox': {
      if (action === 'read') {
        // Self or staff (DB role after the C2.4 M2 flip). The route keeps
        // its student lookup (404) and branch-mismatch 403 inline after
        // the gate, exactly as today.
        if (resource.username === ctx.actor.username) return allow()
        if (ctx.actor.role === 'faculty' || ctx.actor.role === 'admin') return allow()
        return deny('notOwner', 'Forbidden.')
      }
      if (action === 'markRead') {
        if (resource.username !== ctx.actor.username) return deny('notOwner', 'Forbidden.')
        return allow()
      }
      return deny('role', 'Not supported.')
    }

    case 'notification.outbox': {
      if (action !== 'read') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty' && ctx.actor.role !== 'admin')
        return deny('role', 'Unauthorized: faculty or admin only')
      return allow()
    }

    case 'notification.send': {
      if (action !== 'send') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty') return deny('role', 'Unauthorized: faculty only')
      if (resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      // Ownership is resolved in the route against the teaching load:
      // unowned sectionKeys are silently dropped (preserved behavior,
      // NOTIF-SEND-UNOWNED), all-unowned is a 403 with the load message.
      return allow()
    }

    case 'notification.cleanup': {
      // Admin sessions only from the policy side (DB role after the C2.1
      // M2 flip). The Bearer CRON_SECRET path is proxy/route territory —
      // FIX-M3 (C3.6) admits it in proxy.ts with a timing-safe compare.
      if (ctx.actor.role !== 'admin') return deny('role', 'Unauthorized: admin only')
      return allow()
    }

    // -----------------------------------------------------------------
    // Admin and shared branch surfaces
    // -----------------------------------------------------------------
    case 'admin.directory':
    case 'admin.stats': {
      if (action !== 'read') return deny('role', 'Not supported.')
      // D1 pins: school-wide admin reads are the documented product
      // decision (issues #78, #79 registry rows). No branch scope.
      if (ctx.actor.role !== 'admin') return deny('role', 'Unauthorized: admin only')
      return allow()
    }

    case 'admin.enrollment': {
      if (action !== 'read' && action !== 'update' && action !== 'create')
        return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'admin') return deny('role', 'Unauthorized: admin only')
      // Reads are school-wide (D1). Writes pass the target doc's branch for
      // parity: the route fetches it and supplies resource.branch.
      if (action !== 'read' && resource.branch !== undefined && resource.branch !== ctx.actor.branch)
        return deny('branch', 'Branch mismatch')
      return allow()
    }

    case 'branch.calendar':
    case 'branch.directory': {
      if (action === 'read') return allow() // any authed, self-branch reads
      if (action !== 'create' && action !== 'update' && action !== 'delete')
        return deny('role', 'Not supported.')
      // Events/professors writes: admin only; filters stamp performer.branch
      // (no claimed-branch parity on these surfaces today).
      if (ctx.actor.role !== 'admin') return deny('role', 'Unauthorized: admin only')
      return allow()
    }

    // -----------------------------------------------------------------
    // Faculty reads over the actor's own load
    // -----------------------------------------------------------------
    case 'faculty.roster':
    case 'faculty.history': {
      if (action !== 'read') return deny('role', 'Not supported.')
      if (ctx.actor.role !== 'faculty' && ctx.actor.role !== 'admin')
        return deny('role', 'Unauthorized: faculty or admin only')
      return allow()
    }

    // -----------------------------------------------------------------
    // Self-service account
    // -----------------------------------------------------------------
    case 'account.password': {
      if (action !== 'update') return deny('role', 'Not supported.')
      // The route keeps its username equality gate (claimed username vs
      // session), old-password verification, and tv bump; the guard covers
      // authentication and the spoof check on the claimed username.
      return allow()
    }

    case 'account.photo': {
      if (action !== 'update' && action !== 'delete' && action !== 'cleanup')
        return deny('role', 'Not supported.')
      if (resource.username !== ctx.actor.username) return deny('notOwner', 'Forbidden.')
      // Photo/cleanup routes self-scope via session-stamped filters and
      // folder-prefix containment built from session values.
      return allow()
    }
  }
}
