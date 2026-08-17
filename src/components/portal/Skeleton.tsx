'use client'

// ============================================================
//  Skeleton primitives
//  Shimmer-animated placeholders shown while data is loading
//  from MongoDB. Each primitive mirrors the shape of a real
//  component so the layout doesn't jump when data arrives.
//
//  The shimmer comes from the `.aics-skeleton` class defined in
//  globals.css (a slow gradient sweep — softer than animate-pulse).
// ============================================================

/** Base block — the building block for all skeletons. */
function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`aics-skeleton ${className}`} aria-hidden />
}

// ------------------------------------------------------------
//  PortalShell — shared sidebar + topbar skeleton shell.
//  Every skeleton view (Dashboard, Academics, Profile, Events)
//  uses this identical chrome, so we extract it to eliminate
//  the 4× duplication (was 89 duplicated lines).
// ------------------------------------------------------------

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      {/* Sidebar (frozen) */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-8 px-2">
          <SkeletonBlock className="w-9 h-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-2.5 w-16" />
          </div>
        </div>
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <div className="lg:pl-60">
        {/* Topbar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
          <SkeletonBlock className="h-6 w-48" />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="w-9 h-9 rounded-full" />
            <SkeletonBlock className="h-8 w-32 rounded-lg" />
          </div>
        </div>

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8">
          {children}
        </main>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
//  Dashboard skeleton — shown while /api/student is loading
//  on the dashboard view.
// ------------------------------------------------------------

export function DashboardSkeleton() {
  return (
    <PortalShell>
      {/* Academic header (hero) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-7 w-64" />
            <div className="flex gap-2 pt-1">
              <SkeletonBlock className="h-6 w-20 rounded-md" />
              <SkeletonBlock className="h-6 w-28 rounded-md" />
              <SkeletonBlock className="h-6 w-24 rounded-md" />
            </div>
          </div>
          <SkeletonBlock className="w-16 h-16 rounded-2xl" />
        </div>
      </div>

      {/* Grades table card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-40" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
        <div className="px-6 py-3 flex gap-6 border-b border-slate-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBlock className="h-2.5 w-10" />
              <SkeletonBlock className="h-5 w-12" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-3.5 flex items-center gap-4">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 flex-1 max-w-xs" />
              <SkeletonBlock className="h-4 w-8" />
              <SkeletonBlock className="h-4 flex-1 max-w-[180px]" />
              <SkeletonBlock className="h-6 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Schedule + Today's Classes */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-36" />
              <SkeletonBlock className="h-3 w-48" />
            </div>
            <SkeletonBlock className="h-8 w-32 rounded-lg" />
          </div>
          <SkeletonBlock className="h-64 w-full rounded-lg" />
        </div>
        <div className="w-full lg:w-[320px] flex-shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PortalShell>
  )
}

// ------------------------------------------------------------
//  Academics skeleton — shown while /api/student is loading
//  on the academics view. Mirrors the AcademicsPage shell.
// ------------------------------------------------------------

export function AcademicsSkeleton() {
  return (
    <PortalShell>
      {/* Back link + title */}
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-7 w-32" />
        <SkeletonBlock className="h-3 w-64" />
      </div>

      {/* Mini-tab switcher */}
      <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-100">
        <SkeletonBlock className="h-9 w-20 rounded-lg" />
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
        <SkeletonBlock className="h-9 w-16 rounded-lg" />
      </div>

      {/* Grades card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-5 w-56" />
            <SkeletonBlock className="h-3 w-24" />
          </div>
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
        </div>
        <div className="px-6 py-3 flex gap-6 border-b border-slate-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBlock className="h-2.5 w-10" />
              <SkeletonBlock className="h-5 w-12" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-3.5 flex items-center gap-4">
              <SkeletonBlock className="h-4 w-16" />
              <SkeletonBlock className="h-4 flex-1 max-w-xs" />
              <SkeletonBlock className="h-4 w-8" />
              <SkeletonBlock className="h-4 flex-1 max-w-[180px]" />
              <SkeletonBlock className="h-6 w-16 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}

// ------------------------------------------------------------
//  Profile skeleton — shown while /api/student is loading
//  on the profile view.
// ------------------------------------------------------------

export function ProfileSkeleton() {
  return (
    <PortalShell>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero card */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-start gap-6">
            <SkeletonBlock className="w-28 h-28 rounded-2xl" />
            <div className="flex-1 space-y-2.5">
              <SkeletonBlock className="h-7 w-56" />
              <SkeletonBlock className="h-4 w-40" />
              <div className="flex gap-2 pt-1">
                <SkeletonBlock className="h-6 w-24 rounded-md" />
                <SkeletonBlock className="h-6 w-28 rounded-md" />
                <SkeletonBlock className="h-6 w-20 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, col) => (
            <div key={col} className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
              <SkeletonBlock className="h-5 w-32" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <SkeletonBlock className="w-8 h-8 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <SkeletonBlock className="h-2.5 w-16" />
                    <SkeletonBlock className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PortalShell>
  )
}

// ------------------------------------------------------------
//  Tasks skeleton — shown inside the Tasks tab while
//  /api/tasks is loading. Mirrors the overview card + filter
//  card + needs attention + course accordion layout.
// ------------------------------------------------------------

export function TasksSkeleton() {
  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-2">
        <SkeletonBlock className="h-6 w-24" />
        <SkeletonBlock className="h-3 w-72" />
      </div>

      {/* Overview card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <SkeletonBlock className="h-5 w-36" />
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <SkeletonBlock className="h-8 w-10 mx-auto" />
                <SkeletonBlock className="h-2.5 w-16 mx-auto" />
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock className="h-3 w-48" />
            <SkeletonBlock className="h-2 w-full rounded-full" />
          </div>
        </div>
      </div>

      {/* Filter card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-4">
        <div className="flex flex-wrap gap-6 items-center">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-2.5 w-12" />
            <SkeletonBlock className="h-10 w-56 rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock className="h-2.5 w-8" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-7 w-14 rounded-md" />
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <SkeletonBlock className="h-2.5 w-10" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-7 w-20 rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Needs attention card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 space-y-2">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="h-3 w-48" />
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-6 py-3 flex items-center gap-3">
              <SkeletonBlock className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock className="h-2.5 w-32" />
                <SkeletonBlock className="h-3.5 w-56" />
              </div>
              <SkeletonBlock className="h-5 w-20 rounded-md flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Course accordion cards */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="h-3.5 w-16" />
                <SkeletonBlock className="h-4 w-40" />
              </div>
              <SkeletonBlock className="h-3 w-32" />
            </div>
            <div className="flex items-center gap-2">
              <SkeletonBlock className="h-5 w-16 rounded-md" />
              <SkeletonBlock className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
//  Events skeleton — shown while /api/events + /api/tasks
//  are loading. Mirrors the EventsPage shell: sidebar + topbar
//  + calendar card + upcoming rail.
// ------------------------------------------------------------

export function EventsSkeleton() {
  return (
    <PortalShell>
      {/* Back link + title */}
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-7 w-28" />
        <SkeletonBlock className="h-3 w-56" />
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Toggle row */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonBlock key={i} className="h-7 w-20 rounded-md" />
              ))}
            </div>
            <SkeletonBlock className="h-6 w-11 rounded-full" />
          </div>

          {/* Calendar card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <SkeletonBlock className="h-5 w-36" />
              <div className="flex gap-2">
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
                <SkeletonBlock className="h-8 w-16 rounded-lg" />
                <SkeletonBlock className="h-8 w-8 rounded-lg" />
              </div>
            </div>
            {/* Weekday row */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="py-2.5 text-center">
                  <SkeletonBlock className="h-3 w-8 mx-auto" />
                </div>
              ))}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[88px] sm:min-h-[96px] p-1.5 border-b border-r border-slate-100">
                  <SkeletonBlock className="h-4 w-4" />
                  <div className="mt-2 flex gap-1">
                    {i % 3 === 0 && <SkeletonBlock className="w-1.5 h-1.5 rounded-full" />}
                    {i % 4 === 0 && <SkeletonBlock className="w-1.5 h-1.5 rounded-full" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 space-y-2">
              <SkeletonBlock className="h-5 w-32" />
              <SkeletonBlock className="h-3 w-36" />
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-12 space-y-1">
                    <SkeletonBlock className="h-2.5 w-8 mx-auto" />
                    <SkeletonBlock className="h-5 w-6 mx-auto" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <SkeletonBlock className="h-3.5 w-32" />
                    <SkeletonBlock className="h-4 w-16 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PortalShell>
  )
}

// ------------------------------------------------------------
//  Professors skeleton — shown while /api/professors is loading.
//  Mirrors the ProfessorsPage shell: sidebar + topbar + card grid.
// ------------------------------------------------------------

export function ProfessorsSkeleton() {
  return (
    <PortalShell>
      {/* Back link + title */}
      <div className="space-y-2">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-7 w-32" />
        <SkeletonBlock className="h-3 w-56" />
      </div>

      {/* Summary chips */}
      <div className="flex gap-3">
        <SkeletonBlock className="h-9 w-32 rounded-lg" />
        <SkeletonBlock className="h-9 w-32 rounded-lg" />
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <SkeletonBlock className="w-11 h-11 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-3 w-32" />
              </div>
            </div>
            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <SkeletonBlock className="h-3 w-48" />
              <SkeletonBlock className="h-3 w-44" />
              <div className="pt-2 border-t border-slate-50 space-y-2">
                <SkeletonBlock className="h-2.5 w-16" />
                <SkeletonBlock className="h-3 w-32" />
                <SkeletonBlock className="h-2.5 w-10" />
                <SkeletonBlock className="h-3 w-40" />
              </div>
            </div>
            {/* Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <SkeletonBlock className="h-2.5 w-full" />
            </div>
          </div>
        ))}
      </div>
    </PortalShell>
  )
}
