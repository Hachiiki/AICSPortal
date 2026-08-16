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
