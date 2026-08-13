// Mock data for the AICS portal.
// Used as a fallback when MongoDB is unavailable and for test credentials.
// The primary data source is MongoDB (see scripts/seed-mongodb.ts).

import type { Student } from './types'

/**
 * Test credentials for quick demo login.
 * Used by the "Test Student Login" button on the login page.
 */
export const TEST_CREDENTIALS = {
  username: 'juan.santos',
  password: 'student123',
} as const

/**
 * Test student account used for the demo.
 * Juan Dela Cruz Santos — BSCS 3rd Year, AICS Commonwealth.
 */
export const TEST_STUDENT: Student = {
  username: 'juan.santos',
  fullName: 'Juan Dela Cruz Santos',
  firstName: 'Juan',
  lastName: 'Santos',
  middleName: 'Dela Cruz',
  studentNumber: '251438',
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
  branch: 'commonwealth',
  branchAddress: 'AICS Bldg., Commonwealth Ave., Cor., Holy Spirit Drive Brgy. Don Antonio, Quezon City',
  subjects: [
    {
      code: 'CS 101',
      title: 'Introduction to Computing',
      units: 3,
      professor: 'Engr. Maria Cristina Reyes',
      professorEmail: 'm.reyes@aics.edu.ph',
      schedule: 'Mon / Wed 8:00 - 9:30 AM',
      room: 'Room 101',
      midterm: '1.25',
      finals: '1.25',
      finalGrade: '1.25',
      remarks: 'Passed',
    },
    {
      code: 'CS 102',
      title: 'Computer Programming I',
      units: 3,
      professor: 'Engr. Carlos Santos',
      professorEmail: 'c.santos@aics.edu.ph',
      schedule: 'Tue / Thu 10:00 - 11:30 AM',
      room: 'Room 105',
      midterm: '1.50',
      finals: '1.50',
      finalGrade: '1.50',
      remarks: 'Passed',
    },
    {
      code: 'CS 201',
      title: 'Data Structures and Algorithms',
      units: 3,
      professor: 'Prof. Anna Lim',
      professorEmail: 'a.lim@aics.edu.ph',
      schedule: 'Mon / Wed 10:00 - 11:30 AM',
      room: 'Lab 201',
      midterm: '1.00',
      finals: '1.25',
      finalGrade: '1.00',
      remarks: 'Passed',
    },
    {
      code: 'CS 202',
      title: 'Object-Oriented Programming',
      units: 3,
      professor: 'Engr. Roberto Cruz',
      professorEmail: 'r.cruz@aics.edu.ph',
      schedule: 'Fri 8:00 - 9:30 AM',
      room: 'Room 203',
      midterm: '1.75',
      finals: '1.50',
      finalGrade: '1.50',
      remarks: 'Passed',
    },
    {
      code: 'CS 203',
      title: 'Database Systems',
      units: 3,
      professor: 'Prof. Patricia Villanueva',
      professorEmail: 'p.villanueva@aics.edu.ph',
      schedule: 'Mon / Tue 1:00 - 2:30 PM',
      room: 'Lab 202',
      midterm: '1.25',
      finals: '1.50',
      finalGrade: '1.25',
      remarks: 'Passed',
    },
    {
      code: 'CS 204',
      title: 'Web Development',
      units: 3,
      professor: 'Engr. James Villanueva',
      professorEmail: 'j.villanueva@aics.edu.ph',
      schedule: 'Thu 1:00 - 2:30 PM',
      room: 'Lab 203',
      midterm: '1.00',
      finals: '1.00',
      finalGrade: '1.00',
      remarks: 'Passed',
    },
    {
      code: 'PE 1',
      title: 'Physical Fitness',
      units: 2,
      professor: 'Coach Felix Guerrero',
      professorEmail: 'f.guerrero@aics.edu.ph',
      schedule: 'Sat 8:00 - 10:00 AM',
      room: 'Gymnasium',
      midterm: '1.00',
      finals: '1.00',
      finalGrade: '1.00',
      remarks: 'Passed',
    },
  ],
  schedule: [],
  documents: [
    { name: 'Form 138 (Senior High School Report Card)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
    { name: 'PSA Birth Certificate', submitted: true, dateSubmitted: 'Jun 15, 2024' },
    { name: '2x2 ID Picture (2 copies)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
    { name: 'Certificate of Good Moral Character', submitted: true, dateSubmitted: 'Jun 16, 2024' },
    { name: 'Medical Certificate', submitted: false, dateSubmitted: null },
    { name: 'Honorable Dismissal (for transferees)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
  ],
}

// Days shown in the weekly schedule grid (Monday to Saturday).
export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

// Full display name for each day code.
export const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
}
