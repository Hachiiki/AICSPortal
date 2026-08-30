'use client'

import { GraduationCap, LogOut, School, ShieldCheck } from 'lucide-react'
import type { Role } from '@/lib/mongodb/types'

// ============================================================
//  RoleGate — the landing surface for non-student roles.
//
//  Students route straight into the student dashboard. Faculty
//  and admin dashboards don't exist yet (see the roadmap), so
//  authenticated users with those roles land here instead of a
//  failing /api/student fetch. When a role's portal is built,
//  swap this component for the real dashboard in page.tsx's
//  role branch.
// ============================================================

const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Administrator',
}

interface RoleGateProps {
  role: Role
  username: string
  onLogout: () => void
}

export function RoleGate({ role, username, onLogout }: RoleGateProps) {
  return (
    <div className="min-h-dvh bg-slate-50 font-sans grid place-items-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 grid place-items-center mx-auto">
          {role === 'admin' ? (
            <ShieldCheck className="w-7 h-7" />
          ) : (
            <GraduationCap className="w-7 h-7" />
          )}
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
          {ROLE_LABEL[role]} portal is on its way
        </h1>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          You&apos;re signed in as{' '}
          <span className="font-medium text-slate-700">{username}</span>, but the{' '}
          {ROLE_LABEL[role].toLowerCase()} dashboard hasn&apos;t been released yet. Your account
          and permissions are ready — check back soon.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
          <School className="w-3.5 h-3.5 text-slate-400" />
          Asian Institute of Computer Studies
        </div>
        <button
          onClick={onLogout}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  )
}
