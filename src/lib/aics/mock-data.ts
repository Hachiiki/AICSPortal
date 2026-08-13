// Mock data for the AICS portal.
// Used as a fallback when MongoDB is unavailable and for test credentials.

import type { Student } from './types'

export const TEST_CREDENTIALS = {
  username: 'juan.santos',
  password: 'student123',
} as const

export const TEST_STUDENT: Student = {
  username: 'juan.santos',
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
  deanLister: true,
  deanListerSemester: '1st Sem, AY 2025-2026',
  gpa: '1.27',
  email: 'juan.santos@aics.edu.ph',
  phone: '+63 917 123 4567',
  address: '123 Mabini Street, Brgy. Masambong, Quezon City, Metro Manila 1115',
  emergencyContactName: 'Maria Santos (Mother)',
  emergencyContactNumber: '+63 917 987 6543',
  branch: 'commonwealth',
  branchAddress: 'AICS Bldg., Commonwealth Ave., Cor., Holy Spirit Drive Brgy. Don Antonio, Quezon City',
  subjects: [
    // Term 1: completed, AY 2025-2026
    { code: 'CS 101', title: 'Introduction to Computing', units: 3, professor: 'Engr. Maria Cristina Reyes', professorEmail: 'm.reyes@aics.edu.ph', schedule: 'Mon / Wed 8:00 - 9:30 AM', room: 'Room 101', midterm: '1.25', finals: '1.25', finalGrade: '1.25', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { code: 'CS 102', title: 'Computer Programming I', units: 3, professor: 'Engr. Carlos Santos', professorEmail: 'c.santos@aics.edu.ph', schedule: 'Tue / Thu 10:00 - 11:30 AM', room: 'Room 105', midterm: '1.50', finals: '1.50', finalGrade: '1.50', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { code: 'CS 201', title: 'Data Structures and Algorithms', units: 3, professor: 'Prof. Anna Lim', professorEmail: 'a.lim@aics.edu.ph', schedule: 'Mon / Wed 10:00 - 11:30 AM', room: 'Lab 201', midterm: '1.00', finals: '1.25', finalGrade: '1.00', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { code: 'CS 202', title: 'Object-Oriented Programming', units: 3, professor: 'Engr. Roberto Cruz', professorEmail: 'r.cruz@aics.edu.ph', schedule: 'Fri 8:00 - 9:30 AM', room: 'Room 203', midterm: '1.75', finals: '1.50', finalGrade: '1.50', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { code: 'CS 203', title: 'Database Systems', units: 3, professor: 'Prof. Patricia Villanueva', professorEmail: 'p.villanueva@aics.edu.ph', schedule: 'Mon / Tue 1:00 - 2:30 PM', room: 'Lab 202', midterm: '1.25', finals: '1.50', finalGrade: '1.25', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { code: 'CS 204', title: 'Web Development', units: 3, professor: 'Engr. James Villanueva', professorEmail: 'j.villanueva@aics.edu.ph', schedule: 'Thu 1:00 - 2:30 PM', room: 'Lab 203', midterm: '1.00', finals: '1.00', finalGrade: '1.00', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    { code: 'PE 1', title: 'Physical Fitness', units: 2, professor: 'Coach Felix Guerrero', professorEmail: 'f.guerrero@aics.edu.ph', schedule: 'Sat 8:00 - 10:00 AM', room: 'Gymnasium', midterm: '1.00', finals: '1.00', finalGrade: '1.00', remarks: 'Passed', academicYear: '2025-2026', semester: '1st Sem', yearLevel: '1st Year', status: 'completed' },
    // Term 2: in-progress, AY 2026-2027
    { code: 'CS 205', title: 'Discrete Structures', units: 3, professor: 'Prof. Anna Lim', professorEmail: 'a.lim@aics.edu.ph', schedule: 'Mon / Wed 8:00 - 9:30 AM', room: 'Room 101', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { code: 'CS 206', title: 'Information Management', units: 3, professor: 'Prof. Patricia Villanueva', professorEmail: 'p.villanueva@aics.edu.ph', schedule: 'Tue / Thu 10:00 - 11:30 AM', room: 'Room 105', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { code: 'CS 207', title: 'Platform Technologies', units: 3, professor: 'Engr. James Villanueva', professorEmail: 'j.villanueva@aics.edu.ph', schedule: 'Mon / Wed 10:00 - 11:30 AM', room: 'Lab 201', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { code: 'CS 208', title: 'Systems Administration', units: 3, professor: 'Engr. Carlos Santos', professorEmail: 'c.santos@aics.edu.ph', schedule: 'Fri 8:00 - 9:30 AM', room: 'Room 203', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { code: 'CS 209', title: 'Human-Computer Interaction', units: 3, professor: 'Prof. Denise Ong', professorEmail: 'd.ong@aics.edu.ph', schedule: 'Mon / Tue 1:00 - 2:30 PM', room: 'Lab 202', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { code: 'CS 210', title: 'Application Development', units: 3, professor: 'Engr. Roberto Cruz', professorEmail: 'r.cruz@aics.edu.ph', schedule: 'Thu 1:00 - 2:30 PM', room: 'Lab 203', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
    { code: 'PE 2', title: 'Team Sports', units: 2, professor: 'Coach Felix Guerrero', professorEmail: 'f.guerrero@aics.edu.ph', schedule: 'Sat 8:00 - 10:00 AM', room: 'Gymnasium', midterm: '-', finals: '-', finalGrade: '-', remarks: 'In Progress', academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year', status: 'in-progress' },
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

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
}
