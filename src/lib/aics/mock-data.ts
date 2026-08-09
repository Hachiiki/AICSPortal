// Mock data for the AICS portal.
// This will be replaced with real data from the database/API in production.

import type { Student } from './types'

/**
 * Test credentials for quick demo login.
 * Used by the "Test Student Login" button on the login page.
 */
export const TEST_CREDENTIALS = {
  username: 'student',
  password: 'student123',
} as const

/**
 * Test student account used for the demo.
 * Juan Dela Cruz Santos — BSIT 3rd Year, AICS Quezon City.
 */
export const TEST_STUDENT: Student = {
  fullName: 'Juan Dela Cruz Santos',
  firstName: 'Juan',
  lastName: 'Santos',
  middleName: 'Dela Cruz',
  studentNumber: '2024-00123',
  program: 'Bachelor of Science in Information Technology',
  programShort: 'BSIT',
  yearLevel: '3rd Year',
  section: 'IT-3A',
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
  branch: 'AICS Quezon City',
  branchAddress: 'Quezon Avenue, Quezon City, Metro Manila',
  subjects: [
    {
      code: 'IT 301',
      title: 'Web Systems and Technologies',
      units: 3,
      professor: 'Engr. Maria Cristina Reyes',
      professorEmail: 'm.reyes@aics.edu.ph',
      schedule: 'Mon / Wed 8:00 - 9:30 AM',
      room: 'Computer Lab 201',
      midterm: '1.25',
      finals: '1.25',
      finalGrade: '1.25',
      remarks: 'Passed',
    },
    {
      code: 'IT 302',
      title: 'Database Management Systems',
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
      code: 'IT 303',
      title: 'Object-Oriented Programming',
      units: 3,
      professor: 'Prof. Anna Lim',
      professorEmail: 'a.lim@aics.edu.ph',
      schedule: 'Mon / Wed 10:00 - 11:30 AM',
      room: 'Computer Lab 202',
      midterm: '1.00',
      finals: '1.25',
      finalGrade: '1.00',
      remarks: 'Passed',
    },
    {
      code: 'IT 304',
      title: 'Network Fundamentals',
      units: 3,
      professor: 'Engr. Roberto Cruz',
      professorEmail: 'r.cruz@aics.edu.ph',
      schedule: 'Tue / Thu 1:00 - 2:30 PM',
      room: 'Network Lab 1',
      midterm: '1.75',
      finals: '1.50',
      finalGrade: '1.50',
      remarks: 'Passed',
    },
    {
      code: 'IT 305',
      title: 'System Analysis and Design',
      units: 3,
      professor: 'Prof. Patricia Villanueva',
      professorEmail: 'p.villanueva@aics.edu.ph',
      schedule: 'Fri 8:00 - 11:00 AM',
      room: 'Room 203',
      midterm: '1.25',
      finals: '1.50',
      finalGrade: '1.25',
      remarks: 'Passed',
    },
    {
      code: 'PE 3',
      title: 'Physical Fitness and Rhythmic Activities',
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
  schedule: [
    { day: 'Mon', start: '08:00', end: '09:30', subject: 'IT 301', title: 'Web Systems', room: 'Lab 201', professor: 'Engr. Reyes', color: '#287CBB' },
    { day: 'Mon', start: '10:00', end: '11:30', subject: 'IT 303', title: 'OOP', room: 'Lab 202', professor: 'Prof. Lim', color: '#4EA4D7' },
    { day: 'Tue', start: '10:00', end: '11:30', subject: 'IT 302', title: 'Database', room: 'Room 105', professor: 'Engr. Santos', color: '#64BFE9' },
    { day: 'Tue', start: '13:00', end: '14:30', subject: 'IT 304', title: 'Networks', room: 'Net Lab 1', professor: 'Engr. Cruz', color: '#153357' },
    { day: 'Wed', start: '08:00', end: '09:30', subject: 'IT 301', title: 'Web Systems', room: 'Lab 201', professor: 'Engr. Reyes', color: '#287CBB' },
    { day: 'Wed', start: '10:00', end: '11:30', subject: 'IT 303', title: 'OOP', room: 'Lab 202', professor: 'Prof. Lim', color: '#4EA4D7' },
    { day: 'Thu', start: '10:00', end: '11:30', subject: 'IT 302', title: 'Database', room: 'Room 105', professor: 'Engr. Santos', color: '#64BFE9' },
    { day: 'Thu', start: '13:00', end: '14:30', subject: 'IT 304', title: 'Networks', room: 'Net Lab 1', professor: 'Engr. Cruz', color: '#153357' },
    { day: 'Fri', start: '08:00', end: '11:00', subject: 'IT 305', title: 'SA&D', room: 'Room 203', professor: 'Prof. Villanueva', color: '#287CBB' },
    { day: 'Sat', start: '08:00', end: '10:00', subject: 'PE 3', title: 'PE', room: 'Gym', professor: 'Coach Guerrero', color: '#4EA4D7' },
  ],
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
