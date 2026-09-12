'use client'

import { useState } from 'react'
import { CircleHelp, ChevronDown, Mail, MapPin, Inbox } from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'
import { PortalShell } from './PortalShell'

interface HelpSupportPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  inbox?: NotificationInbox
}

// Shared FAQ. Role-specific answers branch on isFaculty so one page
// serves every portal without student-only instructions leaking.
function faqsFor(isFaculty: boolean): { q: string; a: string }[] {
  const shared = [
    {
      q: 'I forgot my password. What do I do?',
      a: 'Open Settings, then the Security tab, and change it with your current password. If you cannot log in at all, contact your branch admin to reset it.',
    },
    {
      q: 'Who do I contact about my account?',
      a: 'Your branch admin handles portal accounts. The Registrar Office handles enrollment and records.',
    },
  ]
  if (isFaculty) {
    return [
      {
        q: 'How do grades reach students?',
        a: 'Encode a period in Grade Encoding, submit it, and the registrar releases it. Students only ever see released periods.',
      },
      {
        q: 'Where do I see my teaching history?',
        a: 'Previous Records lists every released term you taught, grouped by academic year. The current term never appears there.',
      },
      {
        q: 'How do I close task submissions?',
        a: 'Open Tasks, find the assignment, and choose Close submissions. Reopen works the same way.',
      },
      ...shared,
    ]
  }
  return [
    {
      q: 'Why do my grades show a dash?',
      a: 'A dash means that period is not released yet. Your teacher submits grades first, then the registrar releases them.',
    },
    {
      q: 'Where do I submit coursework?',
      a: 'Open Academics, then the Tasks tab. Each task shows its own status and due date.',
    },
    ...shared,
  ]
}

export function HelpSupportPage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: HelpSupportPageProps) {
  const isFaculty = student.role === 'faculty'
  const faqs = faqsFor(isFaculty)
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <PortalShell
      student={student}
      active="help"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Help & Support</h1>
          <p className="text-sm text-slate-500 mt-1">
            Answers to common questions, plus how to reach a human.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
            <CircleHelp className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Frequently asked questions</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {faqs.map((f, i) => {
              const open = openIndex === i
              return (
                <div key={i}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : i)}
                    aria-expanded={open}
                    className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <p className="px-6 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Contact support</h2>
          </div>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Account help</p>
                <p className="font-medium text-slate-900">Your branch admin, for password resets and login trouble.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Inbox className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Registrar</p>
                <p className="font-medium text-slate-900">The registrar's office, for enrollment and records.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Office</p>
                <p className="font-medium text-slate-900">{student.branchAddress || 'AICS Commonwealth'}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </PortalShell>
  )
}
