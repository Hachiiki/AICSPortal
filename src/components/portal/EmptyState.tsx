'use client'

import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  /** Lucide icon shown in the soft brand circle. */
  icon: LucideIcon
  /** Primary message, e.g. "No tasks for this term." */
  message: string
  /** Optional supporting line, e.g. "When a teacher posts a task, it shows up here." */
  hint?: string
  /** Optional action node (button/link) rendered under the text. */
  action?: React.ReactNode
  /**
   * compact: for inline widgets and small panels inside an existing card
   * (today's classes, day-picker lists, dashboard stat lists).
   * default: for page/section bodies (tables, grids, full lists).
   */
  compact?: boolean
  className?: string
}

/**
 * Standard empty state across the portal, faculty, and admin surfaces.
 *
 * One icon treatment (soft brand circle + Brand-600 icon — 3.7:1 non-text
 * contrast, WCAG 1.4.11), one message treatment (Body #475569 on white —
 * 7:1), one optional hint treatment (Muted #64748B on white — 4.8:1).
 * Replaces the three ad-hoc patterns (bare slate icon, plain text, mixed
 * circles) that previously drifted page to page.
 */
export function EmptyState({ icon: Icon, message, hint, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`${compact ? 'py-6 px-4' : 'py-12 px-6'} text-center${className ? ` ${className}` : ''}`}
    >
      <div
        className={`${
          compact ? 'size-10 mb-2.5' : 'size-12 mb-3'
        } rounded-full bg-blue-50 text-link grid place-items-center mx-auto`}
      >
        <Icon className={compact ? 'w-5 h-5' : 'w-6 h-6'} aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-slate-600">{message}</p>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
