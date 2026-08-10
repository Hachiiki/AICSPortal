// Barrel export for AICS portal shared utilities.
export { PALETTE } from './palette'
export type { PaletteColor } from './palette'
export type {
  View,
  AuthMode,
  FaceState,
  Subject,
  ScheduleEntry,
  StudentDocument,
  Student,
  IconType,
} from './types'
export { getInitials, formatTime, timeToMinutes } from './format'
export { TEST_CREDENTIALS, TEST_STUDENT, DAYS, DAY_LABELS } from './mock-data'
export {
  CLASS_SESSIONS,
  SUBJECT_COLORS,
  WEEKDAYS,
  WEEKDAY_LABELS,
  CALENDAR_HOURS,
} from './schedule-data'
export type { Weekday, SubjectColorKey, SubjectColorTokens, ClassSession } from './schedule-data'
