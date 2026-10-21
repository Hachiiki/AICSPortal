// Client-safe permission IDs (Phase 2 design section 4.6).
//
// Permission IDs ONLY — no server imports, no policy logic, no Mongo. The
// nav filter checks these IDs against a role-to-permission map that mirrors
// the server table for DISPLAY purposes only. Nothing security-relevant is
// decided here: URLs are display-only, data lives under the session
// identity, and the server re-decides every request through can().
//
// ID convention: <resourceKind>.<action>, matching the server vocabulary in
// types.ts so a review can diff the mirror against the table by eye.

export const PERMISSIONS = {
  // announcements (reads are open to every authed user)
  manageAnnouncements: 'announcement.create',
  markAnnouncementsRead: 'announcement.reads.markRead',
  // branch surfaces
  manageEvents: 'branch.calendar.create',
  manageProfessors: 'branch.directory.create',
  // admin surfaces
  viewAdminDirectory: 'admin.directory.read',
  viewAdminStats: 'admin.stats.read',
  manageEnrollment: 'admin.enrollment.read',
  // grades
  viewReleaseQueue: 'grade.releaseQueue.read',
  releaseGrades: 'grade.releaseQueue.release',
  viewGradeAudits: 'grade.audits.read',
  encodeGrades: 'grade.period.update',
  submitGrades: 'grade.submit.submit',
  // attendance
  viewAttendance: 'attendance.read',
  takeAttendance: 'attendance.update',
  // tasks
  postTasks: 'task.section.create',
  gradeTasks: 'task.grade',
  viewFacultyTasks: 'task.board.read',
  viewMyStudents: 'faculty.roster.read',
  viewPreviousRecords: 'faculty.history.read',
  // materials
  viewMaterials: 'material.list.read',
  uploadMaterials: 'material.upload.create',
  // notifications
  sendNotifications: 'notification.send.send',
  viewSentNotifications: 'notification.outbox.read',
  // self-service
  changePassword: 'account.password.update',
  updatePhoto: 'account.photo.update',
} as const

export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
