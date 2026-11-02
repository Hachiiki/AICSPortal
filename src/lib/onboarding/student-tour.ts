import type { TourStep } from './tour/steps'

/** Real student surfaces. Missing announcements and mobile nav degrade through
 * the engine's existing wait/skip and sheet behavior. */
export const STUDENT_TOUR_STEPS: TourStep[] = [
  { id: 'student-overview', view: 'dashboard', target: 'student-overview', title: 'Your student dashboard', body: 'See your current term, academic summary and class schedule in one place.', side: 'bottom' },
  { id: 'student-announcements', view: 'dashboard', target: 'student-announcements', title: 'Keep up with announcements', body: 'Check campus updates here. Read each notice for its details and any action you need to take.', side: 'bottom', maxWaitMs: 1500 },
  { id: 'student-academics', view: 'academics', target: 'academics-tabs', title: 'Your academic record', body: 'Switch between grades, subjects, tasks and materials. Grades appear when the registrar releases them.', side: 'bottom' },
  { id: 'student-tasks', view: 'academics', target: 'academics-tab-tasks', title: 'Find coursework in Tasks', body: 'Open this tab to see assignments, due dates and submission status. Each task explains how to submit your work.', side: 'bottom' },
  { id: 'student-events', view: 'events', target: 'events-page', title: 'Plan around campus events', body: 'Use the events calendar to check academic dates, deadlines and campus activities.', side: 'bottom' },
  { id: 'student-account', target: 'topbar-profile', title: 'Your profile and account', body: 'Use the account menu to open your profile. Settings is where you update account details, your photo and password.', side: 'bottom' },
  { id: 'student-help', view: 'help', target: 'student-tour-replay', title: 'Help is always here', body: 'Replay this tour or resume Getting started from Help & Support whenever you need a reminder.', side: 'top' },
]
