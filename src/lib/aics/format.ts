// Formatting helpers for the AICS portal.

/**
 * Returns the initials of a full name (first letter of first and last word).
 * Example: "Juan Dela Cruz Santos" -> "JS"
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

/**
 * Converts a 24-hour time string ("HH:MM") to a 12-hour formatted string.
 * Example: "13:00" -> "1:00 PM"
 */
export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

/**
 * Converts a 24-hour time string ("HH:MM") to minutes since midnight.
 * Used for sorting schedule entries chronologically.
 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
