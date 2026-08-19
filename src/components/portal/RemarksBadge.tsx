'use client'

// ============================================================
//  RemarksBadge — plain-text remarks pill for grade tables.
//  No icons. Color is derived from the remarks text so the
//  same component works everywhere (dashboard + academics).
//
//  Supported values:
//    "Passed"      → green
//    "In Progress" → slate/grey
//    "INC"         → amber (incomplete)
//    (anything else falls back to slate/grey)
// ============================================================

interface RemarksBadgeProps {
  remarks: string
}

const REMARKS_STYLES: Record<string, string> = {
  passed: 'bg-green-50 text-green-700',
  'in progress': 'bg-slate-100 text-slate-600',
  inc: 'bg-amber-50 text-amber-700',
  incomplete: 'bg-amber-50 text-amber-700',
}

export function RemarksBadge({ remarks }: RemarksBadgeProps) {
  const key = remarks.toLowerCase().trim()
  const badgeClass = REMARKS_STYLES[key] ?? 'bg-slate-100 text-slate-600'
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${badgeClass}`}
    >
      {remarks}
    </span>
  )
}
