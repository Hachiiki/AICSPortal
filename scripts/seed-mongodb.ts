// ============================================================
//  Seed script — pushes all data into MongoDB
//  under the "commonwealth" branch.
//
//  Run with:
//    MONGODB_URI=... MONGODB_DB=aics_portal node --experimental-strip-types scripts/seed-mongodb.ts
// ============================================================

import { MongoClient } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB || 'aics_portal'

if (!uri) {
  console.error('MONGODB_URI is not set. Add it to .env.local')
  process.exit(1)
}

const BRANCH = 'commonwealth' as const

// The only branch available for now
const BRANCH_NAME = 'AICS Commonwealth'
const BRANCH_ADDRESS = 'AICS Bldg., Commonwealth Ave., Cor., Holy Spirit Drive Brgy. Don Antonio, Quezon City'

// Available courses at the Commonwealth branch
const AVAILABLE_PROGRAMS = [
  'Bachelor of Science in Computer Science',
  'Bachelor of Science in Computer Engineering',
  'Bachelor of Science in Entrepreneur',
]

async function seed() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  console.log(`Connected to MongoDB: ${dbName}`)
  console.log(`Seeding branch: ${BRANCH}`)
  console.log(`Branch address: ${BRANCH_ADDRESS}`)
  console.log(`Available programs: ${AVAILABLE_PROGRAMS.join(', ')}`)

  // ----------------------------------------------------------
  //  1. Courses (subject catalog for the branch)
  // ----------------------------------------------------------
  const courses = [
    { branch: BRANCH, code: 'CS 101', title: 'Introduction to Computing', shortTitle: 'Intro Computing', color: 'blue' as const },
    { branch: BRANCH, code: 'CS 102', title: 'Computer Programming I', shortTitle: 'Programming I', color: 'green' as const },
    { branch: BRANCH, code: 'CS 201', title: 'Data Structures and Algorithms', shortTitle: 'Data Structures', color: 'amber' as const },
    { branch: BRANCH, code: 'CS 202', title: 'Object-Oriented Programming', shortTitle: 'OOP', color: 'violet' as const },
    { branch: BRANCH, code: 'CS 203', title: 'Database Systems', shortTitle: 'Database', color: 'blue' as const },
    { branch: BRANCH, code: 'CS 204', title: 'Web Development', shortTitle: 'Web Dev', color: 'green' as const },
    { branch: BRANCH, code: 'PE 1', title: 'Physical Fitness', shortTitle: 'PE', color: 'red' as const },
  ]

  await db.collection('courses').deleteMany({ branch: BRANCH })
  await db.collection('courses').insertMany(courses)
  console.log(`  ✓ Inserted ${courses.length} courses`)

  // ----------------------------------------------------------
  //  2. Sessions (weekly schedule)
  // ----------------------------------------------------------
  const sessions = [
    // Monday (0)
    { branch: BRANCH, code: 'CS 101', day: 0, start: 8, end: 9.5, room: 'Room 101' },
    { branch: BRANCH, code: 'CS 201', day: 0, start: 10, end: 11.5, room: 'Lab 201' },
    { branch: BRANCH, code: 'CS 203', day: 0, start: 13, end: 14.5, room: 'Lab 202' },
    // Tuesday (1)
    { branch: BRANCH, code: 'CS 102', day: 1, start: 10, end: 11.5, room: 'Room 105' },
    { branch: BRANCH, code: 'CS 203', day: 1, start: 13, end: 14.5, room: 'Lab 202' },
    // Wednesday (2)
    { branch: BRANCH, code: 'CS 101', day: 2, start: 8, end: 9.5, room: 'Room 101' },
    { branch: BRANCH, code: 'CS 201', day: 2, start: 10, end: 11.5, room: 'Lab 201' },
    // Thursday (3)
    { branch: BRANCH, code: 'CS 102', day: 3, start: 10, end: 11.5, room: 'Room 105' },
    { branch: BRANCH, code: 'CS 204', day: 3, start: 13, end: 14.5, room: 'Lab 203' },
    // Friday (4)
    { branch: BRANCH, code: 'CS 202', day: 4, start: 8, end: 9.5, room: 'Room 203' },
    // Saturday (5)
    { branch: BRANCH, code: 'PE 1', day: 5, start: 8, end: 10, room: 'Gym' },
  ]

  await db.collection('sessions').deleteMany({ branch: BRANCH })
  await db.collection('sessions').insertMany(sessions)
  console.log(`  ✓ Inserted ${sessions.length} class sessions`)

  // ----------------------------------------------------------
  //  3. Subjects (enrollments for the test student)
  // ----------------------------------------------------------
  const subjects = [
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 101', title: 'Introduction to Computing', units: 3, professor: 'Engr. Maria Cristina Reyes', professorEmail: 'm.reyes@aics.edu.ph', schedule: 'Mon / Wed 8:00 - 9:30 AM', room: 'Room 101', midterm: '1.25', finals: '1.25', finalGrade: '1.25', remarks: 'Passed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 102', title: 'Computer Programming I', units: 3, professor: 'Engr. Carlos Santos', professorEmail: 'c.santos@aics.edu.ph', schedule: 'Tue / Thu 10:00 - 11:30 AM', room: 'Room 105', midterm: '1.50', finals: '1.50', finalGrade: '1.50', remarks: 'Passed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 201', title: 'Data Structures and Algorithms', units: 3, professor: 'Prof. Anna Lim', professorEmail: 'a.lim@aics.edu.ph', schedule: 'Mon / Wed 10:00 - 11:30 AM', room: 'Lab 201', midterm: '1.00', finals: '1.25', finalGrade: '1.00', remarks: 'Passed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 202', title: 'Object-Oriented Programming', units: 3, professor: 'Engr. Roberto Cruz', professorEmail: 'r.cruz@aics.edu.ph', schedule: 'Fri 8:00 - 9:30 AM', room: 'Room 203', midterm: '1.75', finals: '1.50', finalGrade: '1.50', remarks: 'Passed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 203', title: 'Database Systems', units: 3, professor: 'Prof. Patricia Villanueva', professorEmail: 'p.villanueva@aics.edu.ph', schedule: 'Mon / Tue 1:00 - 2:30 PM', room: 'Lab 202', midterm: '1.25', finals: '1.50', finalGrade: '1.25', remarks: 'Passed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'CS 204', title: 'Web Development', units: 3, professor: 'Engr. James Villanueva', professorEmail: 'j.villanueva@aics.edu.ph', schedule: 'Thu 1:00 - 2:30 PM', room: 'Lab 203', midterm: '1.00', finals: '1.00', finalGrade: '1.00', remarks: 'Passed' },
    { branch: BRANCH, studentUsername: 'juan.santos', code: 'PE 1', title: 'Physical Fitness', units: 2, professor: 'Coach Felix Guerrero', professorEmail: 'f.guerrero@aics.edu.ph', schedule: 'Sat 8:00 - 10:00 AM', room: 'Gymnasium', midterm: '1.00', finals: '1.00', finalGrade: '1.00', remarks: 'Passed' },
  ]

  await db.collection('subjects').deleteMany({ branch: BRANCH, studentUsername: 'juan.santos' })
  await db.collection('subjects').insertMany(subjects)
  console.log(`  ✓ Inserted ${subjects.length} subjects for juan.santos`)

  // ----------------------------------------------------------
  //  4. Student — 6-digit student number, Commonwealth branch
  // ----------------------------------------------------------
  const student = {
    branch: BRANCH,
    username: 'juan.santos',
    password: 'student123',
    fullName: 'Juan Dela Cruz Santos',
    firstName: 'Juan',
    lastName: 'Santos',
    middleName: 'Dela Cruz',
    studentNumber: '251438', // 6-digit student number
    program: 'Bachelor of Science in Computer Science',
    programShort: 'BSCS',
    yearLevel: '3rd Year',
    section: 'CS-3A',
    semester: '1st Semester',
    academicYear: '2025-2026',
    enrollmentStatus: 'Enrolled',
    deanLister: true,
    deanListerSemester: '1st Semester, AY 2025-2026',
    gpa: '1.37',
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
  console.log(`  ✓ Inserted student: juan.santos (branch: ${BRANCH})`)
  console.log(`    Student number: ${student.studentNumber}`)
  console.log(`    Program: ${student.program}`)
  console.log(`    Branch address: ${student.branchAddress}`)

  // ----------------------------------------------------------
  //  5. Create indexes for fast lookups
  // ----------------------------------------------------------
  await db.collection('students').createIndex({ branch: 1, username: 1 }, { unique: true })
  await db.collection('subjects').createIndex({ branch: 1, studentUsername: 1 })
  await db.collection('sessions').createIndex({ branch: 1 })
  await db.collection('courses').createIndex({ branch: 1, code: 1 }, { unique: true })
  console.log(`  ✓ Created indexes`)

  console.log('\n✅ Seed complete!')
  console.log(`   Database: ${dbName}`)
  console.log(`   Branch:   ${BRANCH} (${BRANCH_NAME})`)
  console.log(`   Address:  ${BRANCH_ADDRESS}`)
  console.log(`   Test login:  username="juan.santos" / password="student123"`)
  console.log(`   Student #:   251438`)

  await client.close()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
