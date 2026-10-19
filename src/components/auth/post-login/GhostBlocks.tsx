'use client'

import { MapPin } from 'lucide-react'

// ============================================================
//  GhostBlocks — skeleton-geometry content shared by the three
//  post-login candidates (C / D / E).
//
//  Each region mirrors the REAL DashboardSkeleton exactly — sizes,
//  paddings, radii and .aics-skeleton shimmer blocks — so a candidate
//  overlay's final frame is pixel-equivalent to the live skeleton's
//  first frame. The exit crossfade therefore reads as the same surface
//  continuing to load, not as a second, different animation.
//
//  What the overlay may honestly claim is baked in here: the hero
//  carries only already-verified facts (branch, username — both
//  returned by the login API before the overlay mounts) plus an
//  explicit "preparing your workspace…" line. Content wells are
//  skeleton blocks, never fake content. The "portal ready" toast of
//  the earlier draft is deliberately gone — content readiness is a
//  fact only the real data load can establish.
//
//  Positioning (absolute offsets, including the DevBanner shift the
//  real page renders above its topbar) is owned by the variant files;
//  these are content-only fragments.
// ============================================================

/** Sidebar interior — mirrors the skeleton's fixed w-60 rail. */
export function GhostSidebarContent() {
  return (
    <>
      <div className="flex items-center gap-2 mb-8 px-2">
        <div className="aics-skeleton w-9 h-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <div className="aics-skeleton h-3 w-20" />
          <div className="aics-skeleton h-2.5 w-16" />
        </div>
      </div>
      <div className="space-y-1.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aics-skeleton h-9 w-full rounded-lg" />
        ))}
      </div>
    </>
  )
}

/** Topbar interior — mirrors the skeleton's h-16 bar. */
export function GhostTopbarContent() {
  return (
    <>
      <div className="aics-skeleton h-6 w-48" />
      <div className="flex items-center gap-3">
        <div className="aics-skeleton w-9 h-9 rounded-full" />
        <div className="aics-skeleton h-8 w-32 rounded-lg" />
      </div>
    </>
  )
}

/**
 * Hero card with the real, already-verified identity. Everything shown
 * here is true at render time: the login API has verified the session
 * and reported the branch before any overlay mounts. `children` lets a
 * concept add its own flourish (e.g. Frame Draw's underline sweep).
 */
export function GhostHeroText({
  branch,
  username,
  children,
}: {
  branch: string
  username: string
  children?: React.ReactNode
}) {
  const branchDisplay = branch.charAt(0).toUpperCase() + branch.slice(1)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700">
            <MapPin className="w-3.5 h-3.5" />
            AICS {branchDisplay} Branch
          </span>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 pt-1">
            Welcome back
          </h2>
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{username}</span> ·
            preparing your workspace…
          </p>
        </div>
        {/* Mirrors the skeleton hero's right-side block so the card
            geometry matches through the crossfade. */}
        <div className="aics-skeleton w-16 h-16 rounded-2xl" aria-hidden />
      </div>
      {children}
    </div>
  )
}

/** Grades-table well — mirrors the skeleton's grades card. */
export function GhostGradesWell() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" aria-hidden>
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="space-y-2">
          <div className="aics-skeleton h-5 w-40" />
          <div className="aics-skeleton h-3 w-32" />
        </div>
        <div className="aics-skeleton h-8 w-24 rounded-lg" />
      </div>
      <div className="px-6 py-3 flex gap-6 border-b border-slate-100">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="aics-skeleton h-2.5 w-10" />
            <div className="aics-skeleton h-5 w-12" />
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-6 py-3.5 flex items-center gap-4">
            <div className="aics-skeleton h-4 w-16" />
            <div className="aics-skeleton h-4 flex-1 max-w-xs" />
            <div className="aics-skeleton h-4 w-8" />
            <div className="aics-skeleton h-4 flex-1 max-w-[180px]" />
            <div className="aics-skeleton h-6 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Schedule + today row — mirrors the skeleton's bottom row. */
export function GhostScheduleRow() {
  return (
    <div className="flex flex-col lg:flex-row gap-4" aria-hidden>
      <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="aics-skeleton h-5 w-36" />
            <div className="aics-skeleton h-3 w-48" />
          </div>
          <div className="aics-skeleton h-8 w-32 rounded-lg" />
        </div>
        <div className="aics-skeleton h-64 w-full rounded-lg" />
      </div>
      <div className="w-full lg:w-[320px] flex-shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
        <div className="space-y-2 pb-3 border-b border-slate-100">
          <div className="aics-skeleton h-5 w-32" />
          <div className="aics-skeleton h-3 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aics-skeleton h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}
