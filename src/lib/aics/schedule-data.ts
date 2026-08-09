// Centralized schedule data — single source of truth for both the
// weekly calendar grid and the "Today's Classes" panel.
//
// This replaces the old `schedule: ScheduleEntry[]` array on the Student
// object with a richer, typed model that the calendar can position by
// real start/end time.

export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'

export type SubjectColorKey = 'blue' | 'amber' | 'green' | 'purple' | 'red'

export interface SubjectColorTokens {
  /** Pastel background for calendar blocks */
  bg: string
  /** Stronger text/border color for the same subject */
  text: string
  /** Small dot color used in Today's Classes list */
  dot: string
}

export const SUBJECT_COLORS: Record<SubjectColorKey, SubjectColorTokens> = {
  blue: { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' },
  amber: { bg: '#fef3c7', text: '#b45309', dot: '#f59e0b' },
  green: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e' },
  purple: { bg: '#ede9fe', text: '#6d28d9', dot: '#8b5cf6' },
  red: { bg: '#fee2e2', text: '#b91c1c', dot: '#ef4444' },
}

export interface ClassSession {
  /** Subject code, e.g. "IT 301" */
  subjectCode: string
  /** Full subject title, e.g. "Web Systems and Technologies" */
  subjectTitle: string
  /** Short title for compact calendar display, e.g. "Web Systems" */
  shortTitle: string
  /** Day of the week */
  day: Weekday
  /** Start time in 24h "HH:MM" */
  start: string
  /** End time in 24h "HH:MM" */
  end: string
  /** Room / location */
  room: string
  /** Professor name (short form for calendar) */
  professor: string
  /** Color key for visual identification */
  color: SubjectColorKey
}

/**
 * The single source of truth for the student's weekly class schedule.
 * Both the weekly calendar grid and the Today's Classes panel read
 * from this array — there is no separate hard-coded list.
 */
export const CLASS_SESSIONS: ClassSession[] = [
  // Monday
  {
    subjectCode: 'IT 301',
    subjectTitle: 'Web Systems and Technologies',
    shortTitle: 'Web Systems',
    day: 'Mon',
    start: '08:00',
    end: '09:30',
    room: 'Lab 201',
    professor: 'Engr. Reyes',
    color: 'blue',
  },
  {
    subjectCode: 'IT 303',
    subjectTitle: 'Object-Oriented Programming',
    shortTitle: 'OOP',
    day: 'Mon',
    start: '10:00',
    end: '11:30',
    room: 'Lab 202',
    professor: 'Prof. Lim',
    color: 'green',
  },
  // Tuesday
  {
    subjectCode: 'IT 302',
    subjectTitle: 'Database Management Systems',
    shortTitle: 'Database',
    day: 'Tue',
    start: '10:00',
    end: '11:30',
    room: 'Room 105',
    professor: 'Engr. Santos',
    color: 'amber',
  },
  {
    subjectCode: 'IT 304',
    subjectTitle: 'Network Fundamentals',
    shortTitle: 'Networks',
    day: 'Tue',
    start: '13:00',
    end: '14:30',
    room: 'Net Lab 1',
    professor: 'Engr. Cruz',
    color: 'purple',
  },
  // Wednesday
  {
    subjectCode: 'IT 301',
    subjectTitle: 'Web Systems and Technologies',
    shortTitle: 'Web Systems',
    day: 'Wed',
    start: '08:00',
    end: '09:30',
    room: 'Lab 201',
    professor: 'Engr. Reyes',
    color: 'blue',
  },
  {
    subjectCode: 'IT 303',
    subjectTitle: 'Object-Oriented Programming',
    shortTitle: 'OOP',
    day: 'Wed',
    start: '10:00',
    end: '11:30',
    room: 'Lab 202',
    professor: 'Prof. Lim',
    color: 'green',
  },
  // Thursday
  {
    subjectCode: 'IT 302',
    subjectTitle: 'Database Management Systems',
    shortTitle: 'Database',
    day: 'Thu',
    start: '10:00',
    end: '11:30',
    room: 'Room 105',
    professor: 'Engr. Santos',
    color: 'amber',
  },
  {
    subjectCode: 'IT 304',
    subjectTitle: 'Network Fundamentals',
    shortTitle: 'Networks',
    day: 'Thu',
    start: '13:00',
    end: '14:30',
    room: 'Net Lab 1',
    professor: 'Engr. Cruz',
    color: 'purple',
  },
  // Friday
  {
    subjectCode: 'IT 305',
    subjectTitle: 'System Analysis and Design',
    shortTitle: 'SA&D',
    day: 'Fri',
    start: '08:00',
    end: '09:30',
    room: 'Room 203',
    professor: 'Prof. Villanueva',
    color: 'blue',
  },
  // Saturday
  {
    subjectCode: 'PE 3',
    subjectTitle: 'Physical Fitness and Rhythmic Activities',
    shortTitle: 'PE',
    day: 'Sat',
    start: '08:00',
    end: '10:00',
    room: 'Gym',
    professor: 'Coach Guerrero',
    color: 'red',
  },
]

export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
}

/** Hour slots shown on the calendar vertical axis (24h "HH:00") */
export const CALENDAR_HOURS: string[] = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
]
