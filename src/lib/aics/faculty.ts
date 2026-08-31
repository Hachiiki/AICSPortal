// ============================================================
//  Faculty client types
// ============================================================
//  The faculty member's user record lives in the `students`
//  collection (with role='faculty'). These client-side types
//  are the trimmed shapes returned by `/api/faculty`:
//  - `FacultyMember`  — the faculty user's basic info
//  - `FacultyStudent` — a summary of one enrolled student
//
//  The faculty member's full `Student` record (with subjects,
//  schedule, documents, etc.) is also returned by /api/student
//  and reused by the Topbar / Profile / Settings views so we
//  don't duplicate the full type here.
// ============================================================

export interface FacultyMember {
  username: string
  fullName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  branch: string
  semester: string
  academicYear: string
  role: string
}

export interface FacultyStudent {
  username: string
  fullName: string
  studentNumber: string
  program: string
  yearLevel: string
  section: string
  enrollmentStatus?: string
  email?: string
  phone?: string
  gpa?: string
}
