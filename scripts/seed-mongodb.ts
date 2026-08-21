// ============================================================
//  Seed script — pushes all data into MongoDB
//  under the "commonwealth" branch.
//
//  Reads MONGODB_URI and MONGODB_DB from .env.local
//  automatically (via the dotenv package). You can also
//  override them inline if needed:
//
//    node --experimental-strip-types scripts/seed-mongodb.ts
//    MONGODB_URI=... node --experimental-strip-types scripts/seed-mongodb.ts
// ============================================================

import { MongoClient } from 'mongodb'
import { config } from 'dotenv'

// Load .env.local into process.env (silent if file is missing)
config({ path: '.env.local' })

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB || 'aics_portal'

if (!uri) {
  console.error('MONGODB_URI is not set. Add it to .env.local')
  process.exit(1)
}

const BRANCH = 'commonwealth' as const
const BRANCH_NAME = 'AICS Commonwealth'
const BRANCH_ADDRESS = 'AICS Bldg., Commonwealth Ave., Cor., Holy Spirit Drive Brgy. Don Antonio, Quezon City'

// GPA computation: unit-weighted average of finalGrade (2 decimals)
function computeGPA(subjects: { units: number; finalGrade: string }[]): string {
  let totalUnits = 0
  let weightedSum = 0
  for (const s of subjects) {
    const grade = parseFloat(s.finalGrade)
    if (!isNaN(grade)) {
      totalUnits += s.units
      weightedSum += grade * s.units
    }
  }
  if (totalUnits === 0) return '-'
  return (weightedSum / totalUnits).toFixed(2)
}

async function seed() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  console.log(`Connected to MongoDB: ${dbName}`)
  console.log(`Seeding branch: ${BRANCH}`)

  // ----------------------------------------------------------
  //  1. Courses
  // ----------------------------------------------------------
  const courses = [
    { branch: BRANCH, code: 'CS 101', title: 'Introduction to Computing', shortTitle: 'Intro Computing', color: 'blue' as const },
    { branch: BRANCH, code: 'CS 102', title: 'Computer Programming I', shortTitle: 'Programming I', color: 'green' as const },
    { branch: BRANCH, code: 'CS 201', title: 'Data Structures and Algorithms', shortTitle: 'Data Structures', color: 'amber' as const },
    { branch: BRANCH, code: 'CS 202', title: 'Object-Oriented Programming', shortTitle: 'OOP', color: 'violet' as const },
    { branch: BRANCH, code: 'CS 203', title: 'Database Systems', shortTitle: 'Database', color: 'blue' as const },
    { branch: BRANCH, code: 'CS 204', title: 'Web Development', shortTitle: 'Web Dev', color: 'green' as const },
    { branch: BRANCH, code: 'CS 205', title: 'Discrete Structures', shortTitle: 'Discrete', color: 'amber' as const },
    { branch: BRANCH, code: 'CS 206', title: 'Information Management', shortTitle: 'Info Mgmt', color: 'violet' as const },
    { branch: BRANCH, code: 'CS 207', title: 'Platform Technologies', shortTitle: 'Platform Tech', color: 'blue' as const },
    { branch: BRANCH, code: 'CS 208', title: 'Systems Administration', shortTitle: 'SysAdmin', color: 'green' as const },
    { branch: BRANCH, code: 'CS 209', title: 'Human-Computer Interaction', shortTitle: 'HCI', color: 'amber' as const },
    { branch: BRANCH, code: 'CS 210', title: 'Application Development', shortTitle: 'App Dev', color: 'violet' as const },
    { branch: BRANCH, code: 'PE 1', title: 'Physical Fitness', shortTitle: 'PE', color: 'red' as const },
    { branch: BRANCH, code: 'PE 2', title: 'Team Sports', shortTitle: 'PE', color: 'red' as const },
  ]

  await db.collection('courses').deleteMany({ branch: BRANCH })
  await db.collection('courses').insertMany(courses)
  console.log(`  ✓ Inserted ${courses.length} courses`)

  // ----------------------------------------------------------
  //  2. Sessions (weekly schedule — current term only)
  // ----------------------------------------------------------
  const sessions = [
    { branch: BRANCH, code: 'CS 205', day: 0, start: 8, end: 9.5, room: 'Room 101' },
    { branch: BRANCH, code: 'CS 207', day: 0, start: 10, end: 11.5, room: 'Lab 201' },
    { branch: BRANCH, code: 'CS 209', day: 0, start: 13, end: 14.5, room: 'Lab 202' },
    { branch: BRANCH, code: 'CS 206', day: 1, start: 10, end: 11.5, room: 'Room 105' },
    { branch: BRANCH, code: 'CS 209', day: 1, start: 13, end: 14.5, room: 'Lab 202' },
    { branch: BRANCH, code: 'CS 205', day: 2, start: 8, end: 9.5, room: 'Room 101' },
    { branch: BRANCH, code: 'CS 207', day: 2, start: 10, end: 11.5, room: 'Lab 201' },
    { branch: BRANCH, code: 'CS 206', day: 3, start: 10, end: 11.5, room: 'Room 105' },
    { branch: BRANCH, code: 'CS 210', day: 3, start: 13, end: 14.5, room: 'Lab 203' },
    { branch: BRANCH, code: 'CS 208', day: 4, start: 8, end: 9.5, room: 'Room 203' },
    { branch: BRANCH, code: 'PE 2', day: 5, start: 8, end: 10, room: 'Gym' },
  ]

  await db.collection('sessions').deleteMany({ branch: BRANCH })
  await db.collection('sessions').insertMany(sessions)
  console.log(`  ✓ Inserted ${sessions.length} class sessions`)

  // ----------------------------------------------------------
  //  3. Subjects (enrollments — TWO terms for Juan)
  // ----------------------------------------------------------

  // TERM 1: 1st Year / 1st Sem / AY 2025-2026 (completed)
  const term1Subjects = [
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 101', title: 'Introduction to Computing', units: 3, professor: 'Engr. Maria Cristina Reyes', professorEmail: 'm.reyes@aics.edu.ph', schedule: 'Mon / Wed 8:00 - 9:30 AM', room: 'Room 101', midterm: '1.25', finals: '1.25', finalGrade: '1.25', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 102', title: 'Computer Programming I', units: 3, professor: 'Engr. Carlos Santos', professorEmail: 'c.santos@aics.edu.ph', schedule: 'Tue / Thu 10:00 - 11:30 AM', room: 'Room 105', midterm: '1.50', finals: '1.50', finalGrade: '1.50', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 201', title: 'Data Structures and Algorithms', units: 3, professor: 'Prof. Anna Lim', professorEmail: 'a.lim@aics.edu.ph', schedule: 'Mon / Wed 10:00 - 11:30 AM', room: 'Lab 201', midterm: '1.00', finals: '1.25', finalGrade: '1.00', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 202', title: 'Object-Oriented Programming', units: 3, professor: 'Engr. Roberto Cruz', professorEmail: 'r.cruz@aics.edu.ph', schedule: 'Fri 8:00 - 9:30 AM', room: 'Room 203', midterm: '1.75', finals: '1.50', finalGrade: '1.50', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 203', title: 'Database Systems', units: 3, professor: 'Prof. Patricia Villanueva', professorEmail: 'p.villanueva@aics.edu.ph', schedule: 'Mon / Tue 1:00 - 2:30 PM', room: 'Lab 202', midterm: '1.25', finals: '1.50', finalGrade: '1.25', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 204', title: 'Web Development', units: 3, professor: 'Engr. James Villanueva', professorEmail: 'j.villanueva@aics.edu.ph', schedule: 'Thu 1:00 - 2:30 PM', room: 'Lab 203', midterm: '1.00', finals: '1.00', finalGrade: '1.00', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'PE 1', title: 'Physical Fitness', units: 2, professor: 'Coach Felix Guerrero', professorEmail: 'f.guerrero@aics.edu.ph', schedule: 'Sat 8:00 - 10:00 AM', room: 'Gymnasium', midterm: '1.00', finals: '1.00', finalGrade: '1.00', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
  ]

  // TERM 2: 2nd Year / 1st Sem / AY 2026-2027 (in-progress)
  const term2Subjects = [
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 205', title: 'Discrete Structures', units: 3, professor: 'Prof. Anna Lim', professorEmail: 'a.lim@aics.edu.ph', schedule: 'Mon / Wed 8:00 - 9:30 AM', room: 'Room 101', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 206', title: 'Information Management', units: 3, professor: 'Prof. Patricia Villanueva', professorEmail: 'p.villanueva@aics.edu.ph', schedule: 'Tue / Thu 10:00 - 11:30 AM', room: 'Room 105', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 207', title: 'Platform Technologies', units: 3, professor: 'Engr. James Villanueva', professorEmail: 'j.villanueva@aics.edu.ph', schedule: 'Mon / Wed 10:00 - 11:30 AM', room: 'Lab 201', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 208', title: 'Systems Administration', units: 3, professor: 'Engr. Carlos Santos', professorEmail: 'c.santos@aics.edu.ph', schedule: 'Fri 8:00 - 9:30 AM', room: 'Room 203', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 209', title: 'Human-Computer Interaction', units: 3, professor: 'Prof. Denise Ong', professorEmail: 'd.ong@aics.edu.ph', schedule: 'Mon / Tue 1:00 - 2:30 PM', room: 'Lab 202', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 210', title: 'Application Development', units: 3, professor: 'Engr. Roberto Cruz', professorEmail: 'r.cruz@aics.edu.ph', schedule: 'Thu 1:00 - 2:30 PM', room: 'Lab 203', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'PE 2', title: 'Team Sports', units: 2, professor: 'Coach Felix Guerrero', professorEmail: 'f.guerrero@aics.edu.ph', schedule: 'Sat 8:00 - 10:00 AM', room: 'Gymnasium', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
  ]

  const allSubjects = [...term1Subjects, ...term2Subjects]

  await db.collection('subjects').deleteMany({ branch: BRANCH, studentUsername: 'juan.santos' })
  await db.collection('subjects').insertMany(allSubjects)
  console.log(`  ✓ Inserted ${allSubjects.length} subjects for juan.santos (2 terms)`)

  // Compute GPA for completed term
  const term1GPA = computeGPA(term1Subjects)
  const isDeansLister = parseFloat(term1GPA) <= 1.50
  console.log(`  ✓ Term 1 GPA: ${term1GPA}, Dean's Lister: ${isDeansLister}`)

  // ----------------------------------------------------------
  //  4. Student — 2nd Year, AY 2026-2027
  // ----------------------------------------------------------
  const student = {
    branch: BRANCH,
    username: 'juan.santos',
    password: 'student123',
    role: 'student' as const,
    fullName: 'Juan Dela Cruz Santos',
    firstName: 'Juan',
    lastName: 'Santos',
    middleName: 'Dela Cruz',
    studentNumber: '251438',
    program: 'Bachelor of Science in Computer Science',
    programShort: 'BSCS',
    yearLevel: '2nd Year',
    section: 'CS-2A',
    semester: '1st Sem',
    academicYear: '2026-2027',
    enrollmentStatus: 'Enrolled',
    deanLister: isDeansLister,
    deanListerSemester: '1st Sem, AY 2025-2026',
    gpa: term1GPA,
    email: 'juan.santos@aics.edu.ph',
    phone: '+63 917 123 4567',
    address: '123 Mabini Street, Brgy. Masambong, Quezon City, Metro Manila 1115',
    emergencyContactName: 'Maria Santos (Mother)',
    emergencyContactNumber: '+63 917 987 6543',
    branch_name: BRANCH_NAME,
    branchAddress: BRANCH_ADDRESS,
    documents: [
      { name: 'Form 138 (Senior High School Report Card)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
      { name: 'PSA Birth Certificate', submitted: true, dateSubmitted: 'Jun 15, 2024' },
      { name: '2x2 ID Picture (2 copies)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
      { name: 'Certificate of Good Moral Character', submitted: true, dateSubmitted: 'Jun 16, 2024' },
      { name: 'Medical Certificate', submitted: false, dateSubmitted: null },
      { name: 'Honorable Dismissal (for transferees)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
    ],
  }

  await db.collection('students').deleteMany({ branch: BRANCH, username: 'juan.santos' })
  await db.collection('students').insertOne(student)
  console.log(`  ✓ Inserted student: juan.santos (2nd Year, CS-2A, AY 2026-2027)`)

  // ----------------------------------------------------------
  //  5. Tasks (current term + previous term for visibility test)
  // ----------------------------------------------------------
  const now = new Date()
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000)

  const currentTerm = { academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year' }
  const prevTerm = { academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year' }

  const tasks = [
    // CURRENT TERM (AY 2026-2027) — 11 tasks
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 205', term: currentTerm, title: 'Problem Set 1: Logic & Proofs', type: 'Activity', description: null, dueDate: daysFromNow(-6), postedDate: daysFromNow(-20), submitted: true, submittedAt: daysFromNow(-7), score: 9, maxScore: 10, feedback: 'Good work on indirect proofs.', submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 205', term: currentTerm, title: 'Quiz 1: Set Theory', type: 'Quiz', description: null, dueDate: daysFromNow(-2), postedDate: daysFromNow(-10), submitted: true, submittedAt: daysFromNow(-3), score: null, maxScore: 10, feedback: null, submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 205', term: currentTerm, title: 'MP 1: Proof Checker', type: 'Project', description: 'Build a simple proof verification tool', dueDate: daysFromNow(5), postedDate: daysFromNow(-5), submitted: false, submittedAt: null, score: null, maxScore: 50, feedback: null, submissionsClosed: false },
    // CS 206 Activity 1 ERD Modeling — submissions OPEN (overdue + open => MISSING_OPEN => "Submit (Late)")
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 206', term: currentTerm, title: 'Activity 1: ERD Modeling', type: 'Activity', description: null, dueDate: daysFromNow(-3), postedDate: daysFromNow(-15), submitted: false, submittedAt: null, score: null, maxScore: 10, feedback: null, submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 206', term: currentTerm, title: 'Quiz 1: Key Concepts', type: 'Quiz', description: null, dueDate: daysFromNow(-8), postedDate: daysFromNow(-18), submitted: true, submittedAt: daysFromNow(-9), score: 8, maxScore: 10, feedback: null, submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 207', term: currentTerm, title: 'Lab Exercise 1: Audit Tools', type: 'Activity', description: null, dueDate: daysFromNow(-5), postedDate: daysFromNow(-12), submitted: true, submittedAt: daysFromNow(-6), score: 10, maxScore: 10, feedback: 'Perfect submission.', submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 207', term: currentTerm, title: 'Project 1: Site Audit', type: 'Project', description: 'Conduct a full security audit of a sample site', dueDate: daysFromNow(7), postedDate: daysFromNow(-3), submitted: false, submittedAt: null, score: null, maxScore: 50, feedback: null, submissionsClosed: false },
    // CS 208 Activity 1 Users & Permissions — submissions CLOSED by teacher (=> MISSING_CLOSED => "Closed")
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 208', term: currentTerm, title: 'Activity 1: Users & Permissions', type: 'Activity', description: null, dueDate: daysFromNow(-1), postedDate: daysFromNow(-10), submitted: false, submittedAt: null, score: null, maxScore: 10, feedback: null, submissionsClosed: true },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 209', term: currentTerm, title: 'Quiz 1: Heuristics', type: 'Quiz', description: null, dueDate: daysFromNow(-2), postedDate: daysFromNow(-8), submitted: true, submittedAt: daysFromNow(-3), score: null, maxScore: 10, feedback: null, submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 210', term: currentTerm, title: 'Project 1: Requirements Spec', type: 'Project', description: 'Write a full SRS document', dueDate: daysFromNow(3), postedDate: daysFromNow(-2), submitted: false, submittedAt: null, score: null, maxScore: 50, feedback: null, submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'PE 2', term: currentTerm, title: 'Fitness Assessment', type: 'Test', description: null, dueDate: daysFromNow(-4), postedDate: daysFromNow(-14), submitted: true, submittedAt: daysFromNow(-5), score: 20, maxScore: 20, feedback: 'Excellent fitness level.', submissionsClosed: false },
    // PREVIOUS TERM (AY 2025-2026) — MUST NOT render for student
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 101', term: prevTerm, title: 'Final Project', type: 'Project', description: null, dueDate: daysFromNow(-200), postedDate: daysFromNow(-220), submitted: true, submittedAt: daysFromNow(-201), score: 95, maxScore: 100, feedback: null, submissionsClosed: false },
    { branch: BRANCH, studentUsername: 'juan.santos', subjectCode: 'CS 102', term: prevTerm, title: 'Quiz 3: Loops', type: 'Quiz', description: null, dueDate: daysFromNow(-210), postedDate: daysFromNow(-225), submitted: true, submittedAt: daysFromNow(-211), score: 7, maxScore: 10, feedback: null, submissionsClosed: false },
  ]

  await db.collection('tasks').deleteMany({ branch: BRANCH, studentUsername: 'juan.santos' })
  await db.collection('tasks').insertMany(tasks)
  console.log(`  ✓ Inserted ${tasks.length} tasks (${tasks.length - 2} current term, 2 previous term)`)

  await db.collection('tasks').createIndex({ branch: 1, studentUsername: 1, 'term.academicYear': 1, 'term.semester': 1 })

  // ----------------------------------------------------------
  //  6. Events (school-wide calendar — admin-managed)
  //
  //  ADMIN CONTROL: Events are created/edited/deleted by
  //  Admin only. Students have read-only access to this
  //  calendar. The admin UI for managing events will be
  //  wired when the admin portal exists.
  //
  //  Dates are now-relative so the CURRENT month always
  //  has 4-6 events for demo purposes.
  // ----------------------------------------------------------

  // Helper: pick a date in the current month at a given day offset
  // from "today". Negative = earlier this month, positive = later.
  const dayOfThisMonth = (offset: number) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + offset)
    return d
  }

  const events = [
    // Current month — mix of categories
    { branch: BRANCH, title: 'Flag Ceremony', description: 'Monthly flag ceremony at the main quadrangle. All students required to attend.', date: dayOfThisMonth(-12), endDate: null, category: 'campus' as const },
    { branch: BRANCH, title: 'Midterm Examination Week', description: 'Midterm exams for all year levels. Check your subject schedules for exact dates.', date: dayOfThisMonth(-8), endDate: dayOfThisMonth(-4), category: 'academic' as const },
    { branch: BRANCH, title: 'Tuition Installment Deadline', description: 'Second installment of tuition fees due at the Accounting Office.', date: dayOfThisMonth(-2), endDate: null, category: 'deadline' as const },
    { branch: BRANCH, title: 'Foundation Day — No Classes', description: 'AICS Foundation Day celebration. All classes suspended.', date: dayOfThisMonth(2), endDate: null, category: 'holiday' as const },
    { branch: BRANCH, title: 'Campus Clean-up Drive', description: 'Community service event. Bring your own cleaning materials.', date: dayOfThisMonth(5), endDate: null, category: 'campus' as const },
    { branch: BRANCH, title: 'Research Summit 2026', description: 'Annual research presentation by graduating students. Venue: Auditorium.', date: dayOfThisMonth(8), endDate: dayOfThisMonth(9), category: 'academic' as const },
    // Later this month / next month
    { branch: BRANCH, title: 'Career Fair', description: 'IT and CS companies on campus for recruitment. Bring printed resumes.', date: dayOfThisMonth(14), endDate: null, category: 'campus' as const },
    { branch: BRANCH, title: 'Intramurals Opening', description: 'Opening ceremony and parade of teams. Color coding per year level.', date: dayOfThisMonth(18), endDate: dayOfThisMonth(20), category: 'campus' as const },
    { branch: BRANCH, title: 'Final Examination Week', description: 'Final exams for the 1st Semester. Check room assignments.', date: dayOfThisMonth(25), endDate: dayOfThisMonth(28), category: 'academic' as const },
    { branch: BRANCH, title: 'Enrollment Opens — 2nd Sem', description: 'Online enrollment for the 2nd Semester opens at the student portal.', date: dayOfThisMonth(35), endDate: null, category: 'deadline' as const },
  ]

  await db.collection('events').deleteMany({ branch: BRANCH })
  await db.collection('events').insertMany(events)
  console.log(`  ✓ Inserted ${events.length} events`)

  await db.collection('events').createIndex({ branch: 1, date: 1 })

  // ----------------------------------------------------------
  //  7. Professors (directory — admin-managed)
  //
  //  ADMIN CONTROL: Professor directory details (office
  //  hours, room, contact) are maintained by Admin. Students
  //  have read-only access.
  //
  //  The `name` and `email` fields must match the professor
  //  and professorEmail fields on the subjects collection.
  // ----------------------------------------------------------
  const professors = [
    { branch: BRANCH, name: 'Engr. Maria Cristina Reyes', email: 'm.reyes@aics.edu.ph', officeHours: 'Mon & Wed • 1:00-3:00 PM', room: 'Faculty Office / Room 204' },
    { branch: BRANCH, name: 'Engr. Carlos Santos', email: 'c.santos@aics.edu.ph', officeHours: 'Tue & Thu • 9:00-11:00 AM', room: 'Faculty Office / Room 208' },
    { branch: BRANCH, name: 'Prof. Anna Lim', email: 'a.lim@aics.edu.ph', officeHours: 'Mon & Wed • 3:00-5:00 PM', room: 'Faculty Office / Room 210' },
    { branch: BRANCH, name: 'Engr. Roberto Cruz', email: 'r.cruz@aics.edu.ph', officeHours: 'Fri • 10:00 AM-12:00 PM', room: 'Faculty Office / Room 212' },
    { branch: BRANCH, name: 'Prof. Patricia Villanueva', email: 'p.villanueva@aics.edu.ph', officeHours: 'Tue & Thu • 1:00-3:00 PM', room: 'Faculty Office / Room 214' },
    { branch: BRANCH, name: 'Engr. James Villanueva', email: 'j.villanueva@aics.edu.ph', officeHours: 'Mon & Wed • 9:00-11:00 AM', room: 'Faculty Office / Room 216' },
    { branch: BRANCH, name: 'Prof. Denise Ong', email: 'd.ong@aics.edu.ph', officeHours: 'Wed & Fri • 2:00-4:00 PM', room: 'Faculty Office / Room 218' },
    { branch: BRANCH, name: 'Coach Felix Guerrero', email: 'f.guerrero@aics.edu.ph', officeHours: 'Sat • 10:00 AM-12:00 PM', room: 'Gymnasium Office' },
  ]

  await db.collection('professors').deleteMany({ branch: BRANCH })
  await db.collection('professors').insertMany(professors)
  console.log(`  ✓ Inserted ${professors.length} professors`)

  await db.collection('professors').createIndex({ branch: 1, name: 1 }, { unique: true })

  // ----------------------------------------------------------
  //  8. Enrollments (per-student, per-term — registrar-managed)
  //
  //  ADMIN/REGISTRAR CONTROL: Enrollment steps, assessment of
  //  fees, payment status, and registrar contact info are
  //  maintained by the Registrar / Admin. Students have
  //  read-only access via the Enrollment page.
  //
  //  One document per student per term. The current-term
  //  enrollment record is fetched via getEnrollment() and
  //  displayed on the Enrollment page.
  // ----------------------------------------------------------
  const enrollments = [
    {
      branch: BRANCH,
      studentUsername: 'juan.santos',
      academicYear: '2026-2027',
      semester: '1st Sem',
      currentStep: 3, // currently on Payment
      steps: [
        { step: 1, label: 'Pre-enrollment', description: 'Submit pre-enrollment form and select subjects for the upcoming term.', status: 'completed' as const, date: '2026-05-20' },
        { step: 2, label: 'Assessment', description: 'Registrar reviews subject load and issues the official assessment of fees.', status: 'completed' as const, date: '2026-06-02' },
        { step: 3, label: 'Payment', description: 'Pay tuition and miscellaneous fees at the Accounting Office. Installment plans are available.', status: 'current' as const, date: null },
        { step: 4, label: 'Enrolled', description: 'Officially enrolled once full payment (or approved installment) is posted.', status: 'upcoming' as const, date: null },
        { step: 5, label: 'Add/Drop', description: 'Final week to add or drop subjects without academic penalty.', status: 'upcoming' as const, date: null },
      ],
      assessment: {
        tuitionPerUnit: 1500,
        totalUnits: 20,
        tuitionAmount: 30000,
        miscFees: [
          { description: 'Library Fee', amount: 500 },
          { description: 'Laboratory Fee', amount: 1000 },
          { description: 'IT Fee', amount: 500 },
          { description: 'Athletic Fee', amount: 300 },
          { description: 'Medical & Dental Fee', amount: 300 },
          { description: 'ID Fee', amount: 150 },
        ],
        totalAssessment: 32750,
        amountPaid: 20000,
        balance: 12750,
        paymentStatus: 'partial' as const,
        paymentDeadline: '2026-09-15',
        paymentDate: null,
      },
      registrar: {
        name: 'Mrs. Rosario Tan',
        room: 'Room 100',
        officeHours: 'Mon-Fri 9:00 AM - 4:00 PM',
        email: 'registrar@aics.edu.ph',
        phone: '(02) 8XXX-XXXX',
      },
    },
  ]

  await db.collection('enrollments').deleteMany({ branch: BRANCH, studentUsername: 'juan.santos' })
  await db.collection('enrollments').insertMany(enrollments)
  console.log(`  ✓ Inserted ${enrollments.length} enrollment records`)

  await db.collection('enrollments').createIndex(
    { branch: 1, studentUsername: 1, academicYear: 1, semester: 1 },
    { unique: true }
  )

  // ----------------------------------------------------------
  //  9. Announcements (school-wide notices — admin/faculty managed)
  //
  //  ADMIN CONTROL: Announcements are created/edited/deleted by
  //  Admin and Faculty. Students have read-only access.
  // ----------------------------------------------------------
  const announcements = [
    {
      branch: BRANCH,
      title: 'Enrollment deadline extended',
      body: 'The enrollment deadline for 1st Sem AY 2026-2027 has been extended to August 20. Please complete your payment and submit requirements before this date.',
      category: 'deadline',
      priority: 'urgent',
      author: 'Registrar Office',
      postedDate: daysFromNow(-2),
      expiryDate: daysFromNow(5),
    },
    {
      branch: BRANCH,
      title: 'Classes suspended on Monday',
      body: 'Due to Typhoon Signal No. 2, all classes are suspended on Monday. Online classes will continue as scheduled. Stay safe everyone.',
      category: 'campus',
      priority: 'urgent',
      author: 'Admin Office',
      postedDate: daysFromNow(-1),
      expiryDate: daysFromNow(3),
    },
    {
      branch: BRANCH,
      title: 'Midterm examination schedule released',
      body: 'The midterm examination schedule is now available. Check the Events calendar for your exam dates. Please bring your student ID and arrive 15 minutes early.',
      category: 'academic',
      priority: 'normal',
      author: 'Academic Affairs',
      postedDate: daysFromNow(-4),
      expiryDate: null,
    },
    {
      branch: BRANCH,
      title: 'Library extended hours during exam week',
      body: 'The library will be open from 7:00 AM to 9:00 PM during midterm exam week. Study rooms can be reserved at the front desk.',
      category: 'campus',
      priority: 'normal',
      author: 'Library Services',
      postedDate: daysFromNow(-3),
      expiryDate: daysFromNow(10),
    },
    {
      branch: BRANCH,
      title: 'Foundation Day celebration on August 25',
      body: 'No classes on August 25 in celebration of AICS Foundation Day. There will be a program at the gymnasium at 9:00 AM. All students are encouraged to attend.',
      category: 'holiday',
      priority: 'normal',
      author: 'Student Affairs',
      postedDate: daysFromNow(-5),
      expiryDate: daysFromNow(15),
    },
  ]

  await db.collection('announcements').deleteMany({ branch: BRANCH })
  await db.collection('announcements').insertMany(announcements)
  console.log(`  \u2713 Inserted ${announcements.length} announcements`)

  await db.collection('announcements').createIndex({ branch: 1, postedDate: -1 })

  // ----------------------------------------------------------
  //  10. Indexes
  // ----------------------------------------------------------
  await db.collection('students').createIndex({ branch: 1, username: 1 }, { unique: true })
  await db.collection('subjects').createIndex({ branch: 1, studentUsername: 1 })
  await db.collection('sessions').createIndex({ branch: 1 })
  await db.collection('courses').createIndex({ branch: 1, code: 1 }, { unique: true })
  console.log(`  ✓ Created indexes`)

  console.log('\n✅ Seed complete!')
  console.log(`   Student: juan.santos / student123`)
  console.log(`   Student #: 251438`)
  console.log(`   Year: 2nd Year, Section: CS-2A`)
  console.log(`   Current AY: 2026-2027 (in-progress)`)
  console.log(`   Completed AY: 2025-2026 (GPA: ${term1GPA})`)
  console.log(`   Dean's Lister: ${isDeansLister}`)
  console.log(`   Tasks: 11 current term + 2 previous term (hidden from student)`)
  console.log(`   Events: 10 school-wide calendar events`)
  console.log(`   Professors: ${professors.length} directory entries`)
  console.log(`   Enrollments: ${enrollments.length} per-term records (current term: partial payment)`)

  await client.close()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
