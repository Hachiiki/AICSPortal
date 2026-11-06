// Synthetic UI fixtures only. Requests never reach a school database.
import { SignJWT } from 'jose'
import { localEnv } from '../onboarding/isolated-source.mjs'
export const origin = process.env.MOBILE_ORIGIN || 'http://localhost:4350'
export const term = { academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year' }
export const subjects = [
  ['CS201', 'Data Structures and Algorithms', 'Dr. Maria Reyes'],
  ['CS202', 'Object-Oriented Programming', 'Prof. Rafael Mendoza'],
  ['GE104', 'Mathematics in the Modern World', 'Prof. Angela Dela Cruz'],
].map(([code, title, professor]) => ({ ...term, code, title, professor, units: 3, professorEmail: 'faculty@example.invalid', schedule: 'Mon / Wed / Fri 9:00 AM', room: 'Computer Lab 2', prelim: '88', midterm: '-', finals: '-', finalGrade: '-', remarks: 'Pending', status: 'in-progress' }))
export const student = { username: 'mobile.student', role: 'student', fullName: 'Alexandra Dela Cruz', firstName: 'Alexandra', lastName: 'Dela Cruz', middleName: '', studentNumber: '2026-20418', program: 'Bachelor of Science in Computer Science', programShort: 'BSCS', yearLevel: term.yearLevel, section: 'BSCS 2-A', semester: term.semester, academicYear: term.academicYear, enrollmentStatus: 'Enrolled', deanLister: false, deanListerSemester: '', gpa: '88.67', email: 'alexandra@example.invalid', phone: '09171234567', address: 'Quezon City', emergencyContactName: 'Andrea Dela Cruz', emergencyContactNumber: '09171234568', branch: 'commonwealth', branchAddress: 'Commonwealth, Quezon City', subjects, schedule: [], documents: [{ name: 'Form 138 / Report card', submitted: true, dateSubmitted: '2026-07-12' }, { name: 'Certificate of Good Moral Character', submitted: false, dateSubmitted: null }] }
export const courses = subjects.map((s, i) => ({ code: s.code, title: s.title, shortTitle: s.title, color: ['blue', 'green', 'amber'][i] }))
export const sessions = [0, 1, 2, 3, 4, 5].flatMap(day => [{ code: 'CS201', day, start: 9, end: 10.5, room: 'Computer Lab 2' }, { code: 'CS202', day, start: 13, end: 14.5, room: 'Room 204' }])
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
export const tasks = Array.from({ length: 6 }, (_, i) => ({ _id: `mobile-task-${i}`, subjectCode: subjects[i % 3].code, term, title: ['Implement a linked list and explain its time complexity', 'Object-oriented design: library management system', 'Applications of mathematical models', 'Algorithm analysis practice', 'Inheritance and interfaces quiz', 'Problem-solving reflection'][i], type: ['Activity', 'Project', 'Quiz', 'Test', 'Activity', 'Project'][i], description: 'Read the instructions and discuss your approach with your professor. '.repeat(i === 4 ? 40 : 2), dueDate: (i === 3 ? yesterday : tomorrow).toISOString(), postedDate: yesterday.toISOString(), submitted: i === 4 || i === 5, submittedAt: i === 4 || i === 5 ? yesterday.toISOString() : null, score: i === 4 ? 27 : null, maxScore: i === 4 ? 30 : null, feedback: i === 4 ? 'Good explanation. Review the feedback before the next activity. '.repeat(18) : null, submissionsClosed: i === 2 }))
export const announcements = [{ _id: 'mobile-notice', title: 'Midterm examination schedule', body: 'Check your subject schedules and bring your school ID. Contact your professor if you have a schedule conflict.', category: 'academic', priority: 'normal', author: 'Registrar', postedBy: 'Registrar', createdAt: yesterday.toISOString(), publishedAt: yesterday.toISOString(), expiresAt: null, branch: 'commonwealth' }]

export async function fixtureContext(browser, { width = 390, height = 844, fresh = false, role = 'student', failTasksOnce = false, touch = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'en-US', timezoneId: 'Asia/Manila' })
  if (['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) {
    const token = await new SignJWT({ role, branch: student.branch, tv: 0 }).setProtectedHeader({ alg: 'HS256' }).setSubject(student.username).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(localEnv().AUTH_SECRET))
    await context.addCookies([{ name: 'aics_session', value: token, url: origin, httpOnly: true, sameSite: 'Lax' }])
  }
  await context.addInitScript(() => { localStorage.setItem('aics_cookie_consent', 'essential'); localStorage.setItem('theme', 'light') })
  let values = { password: false, profile: false, photo: false, tour: false, announcements: false }
  let preferences = { welcomeSeen: !fresh, checklistDismissed: false, tourNoticeReadVersion: 2, tourNoticeDismissedVersion: 2 }
  const writes = []
  const allTasks = structuredClone(tasks)
  let taskReads = 0
  await context.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== origin) return route.abort()
    if (!url.pathname.startsWith('/api/')) return route.continue()
    const request = route.request()
    const p = url.pathname
    let data = { ok: true }
    if (p === '/api/auth/session') data = { ok: true, username: student.username, role, branch: student.branch }
    else if (p === '/api/student') data = { ok: true, student: { ...student, role }, courses, sessions }
    else if (p === '/api/faculty') data = role === 'faculty' ? { ok: true, faculty: { ...student, role }, subjects, students: [] } : { ok: false }
    else if (p === '/api/onboarding/state') {
      if (request.method() === 'PATCH') { const patch = request.postDataJSON(); values = { ...values, ...patch.updates }; preferences = { ...preferences, ...patch.preferences }; writes.push({ path: p, patch }) }
      data = { ok: true, persisted: true, role, version: 1, values, preferences }
    }
    else if (p === '/api/tasks') {
      taskReads++
      if (failTasksOnce && taskReads === 1) return route.fulfill({ status: 503, json: { ok: false, error: 'Temporary connection failure' } })
      data = { ok: true, tasks: allTasks }
    }
    else if (/^\/api\/tasks\/[^/]+\/submit$/.test(p)) {
      const task = allTasks.find(t => t._id === p.split('/')[3]); if (task) { task.submitted = true; task.submittedAt = new Date().toISOString() }
      writes.push({ path: p, simulated: true }); data = { ok: true }
    }
    else if (p === '/api/announcements') data = { ok: true, announcements, readIds: [] }
    else if (p === '/api/events') data = { ok: true, events: [{ _id: 'mobile-event', title: 'Midterm examinations', date: tomorrow.toISOString().slice(0,10), category: 'academic', description: 'Refer to your subject schedule.', location: 'Commonwealth campus' }] }
    else if (p === '/api/professors') data = { ok: true, professors: subjects.map((s, i) => ({ _id: `prof-${i}`, name: s.professor, email: s.professorEmail, department: 'Computer Studies', room: s.room, officeHours: 'Mon-Fri, 10:00 AM-12:00 PM' })) }
    else if (p === '/api/notifications') data = { ok: true, notifications: [{ _id: 'mobile-notification', title: 'New activity posted', message: tasks[0].title, type: 'task', read: false, createdAt: yesterday.toISOString(), taskId: tasks[0]._id, subjectCode: tasks[0].subjectCode }] }
    else if (p === '/api/enrollment') data = { ok: true, enrollment: { ...term, currentStep: 3, steps: ['Application', 'Documents', 'Assessment', 'Payment', 'Enrollment'].map((label, i) => ({ step: i+1, label, description: `${label} for the current semester`, status: i<2 ? 'completed' : i===2 ? 'current' : 'upcoming', date: i<2 ? '2026-07-12' : null })), assessment: { tuitionPerUnit: 900, totalUnits: 9, tuitionAmount: 8100, miscFees: [{ description: 'Laboratory fee', amount: 1200 }], totalAssessment: 9300, amountPaid: 5000, balance: 4300, paymentStatus: 'partial', paymentDeadline: tomorrow.toISOString(), paymentDate: yesterday.toISOString() }, registrar: { name: 'Registrar Office', room: 'Room 101', officeHours: 'Mon-Fri, 8:00 AM-5:00 PM', email: 'registrar@example.invalid', phone: '(02) 8123-4567' } } }
    else if (p === '/api/materials') data = { ok: true, materials: [
      { _id: 'mobile-material-0', subjectCode: 'CS201', title: 'Week 6 reference: linked lists, memory allocation and algorithm complexity', kind: 'file', url: 'https://example.invalid/reference.pdf', bytes: 384000, format: 'pdf', uploadedAt: yesterday.toISOString(), uploadedBy: 'Dr. Maria Reyes' },
      { _id: 'mobile-material-1', subjectCode: 'CS202', title: 'Object-oriented programming practice and project requirements', kind: 'link', url: 'https://example.invalid/practice', bytes: null, format: null, uploadedAt: yesterday.toISOString(), uploadedBy: 'Prof. Rafael Mendoza' },
    ] }
    else if (!['GET', 'HEAD'].includes(request.method())) return route.fulfill({ status: 403, json: { ok: false, error: 'This UI preview does not change school records.' } })
    return route.fulfill({ json: data })
  })
  return { context, writes }
}
