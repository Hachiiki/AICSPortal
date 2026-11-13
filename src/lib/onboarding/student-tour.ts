import type { TourStep } from './tour/steps'

/** Real student surfaces. Missing announcements and mobile nav degrade through
 * the engine's existing wait/skip and sheet behavior. */
export const STUDENT_TOUR_STEPS: TourStep[] = [
  { id: 'student-overview', view: 'dashboard', target: 'student-overview', title: 'Your student dashboard', body: 'This short tour shows the main areas of your portal. Use Next and Back to look around, or Skip or press Escape to leave anytime.', phoneBody: 'See your next class, due work, and campus updates.', side: 'bottom' },
  { id: 'student-announcements', view: 'dashboard', target: 'student-announcements', phoneTarget: 'announcement-read', title: 'Keep up with announcements', body: 'Choose Read announcement to open the full notice. The checkmark marks it as read; snooze saves it for later.', phoneBody: 'Tap Read announcement to see the full notice.', side: 'bottom', maxWaitMs: 1500 },
  { id: 'student-academics', view: 'academics', target: 'academics-tabs', title: 'Your academic record', body: 'Switch between grades, subjects, tasks and materials. Grades appear when the registrar releases them.', phoneBody: 'Switch between grades, subjects, tasks and materials.', side: 'bottom' },
  { id: 'student-tasks', view: 'academics', target: 'academics-tab-tasks', title: 'Find coursework in Tasks', body: 'Open this tab to see assignments, due dates and submission status. Each task explains how to submit your work.', side: 'bottom' },
  { id: 'student-events', view: 'events', target: 'events-page', phoneTarget: 'events-calendar', shortPhoneTarget: 'events-calendar-dates', title: 'Plan around campus events', body: 'Use the events calendar to check academic dates, deadlines and campus activities.', phoneBody: 'Tap a date to see its events and due dates.', side: 'bottom' },
  { id: 'student-account', target: 'topbar-profile', title: 'Your profile and account', body: 'Use the account menu to open your profile. Settings is where you update account details, your photo and password.', side: 'bottom' },
  { id: 'student-help', view: 'help', target: 'student-tour-replay', title: 'You have reached the last step', body: 'Choose Finish to close this tour and save it as complete. Help & Support keeps replay and Getting started available whenever you need them.', phoneBody: 'Finish now. Replay anytime from Help & Support.', side: 'top' },
]

/** Local to the loaded Tasks tab; no submission or filter is changed by the guide. */
export const TASKS_TOUR_STEPS: TourStep[] = [
  { id: 'tasks-overview', target: 'tasks-overview', shortPhoneTarget: 'tasks-overview-progress', title: 'See where your work stands', body: 'This short guide explains Tasks. Next and Back move between steps; Skip or Escape lets you leave. The overview counts graded, pending, missing and outstanding work.', phoneBody: 'See how many tasks are graded and what’s still open.', side: 'bottom' },
  { id: 'tasks-filters', target: 'tasks-filters', title: 'Find the work you need', body: 'Filter by subject, task type or status. Within each course, tasks are ordered by due date.', phoneBody: 'Filter by subject, task type or status.', side: 'bottom' },
  { id: 'tasks-attention', target: 'tasks-attention', phoneTarget: 'tasks-attention-item', title: 'Start with Needs Attention', body: 'Select an item here to expand its course. Missing and overdue work show their status so you can decide what needs action.', phoneBody: 'Tap an item to find it in its course.', side: 'bottom' },
  { id: 'tasks-courses', target: 'tasks-courses', phoneTarget: 'tasks-course-toggle', title: 'Find tasks by course', body: 'Expand a course to see due dates and status. Submit opens a confirmation about handing in your paper. For submitted or graded tasks, View details shows submission dates, scores and feedback.', phoneBody: 'Open a course to see its tasks.', side: 'top' },
  { id: 'tasks-finish', target: 'tasks-guide-entry', title: 'You are ready to use Tasks', body: 'Finish saves this Tasks guide as complete. Replay it here anytime. Taking the guide never submits a task or changes your coursework.', phoneBody: 'Finish now. Replay the guide here anytime.', side: 'bottom' },
]
