'use client'

import { useState, useMemo } from 'react'
import { Mail, Clock, MapPin, Info, ChevronRight, Users, BookOpen } from 'lucide-react'
import type { Student, Subject, View } from '@/lib/aics/types'
import type { Professor } from '@/lib/aics/professors'
import { getCourse, type Course, type CourseColor } from '@/lib/schedule'
import { getInitials } from '@/lib/aics/format'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// ============================================================
//  ProfessorsPage — current-term professor directory.
//  Shows one card per professor (deduped if they teach
//  multiple subjects), with their subjects (color-coded like
//  the weekly schedule), class schedule/room, office hours,
//  and email contact.
//
//  ADMIN CONTROL: Professor directory details (office
//  hours, room, contact) are maintained by Admin. Students
//  have read-only access.
// ============================================================

interface ProfessorsPageProps {
  student: Student
  professors: Professor[]
  /** Course catalog — used to color-code subject chips like the schedule. */
  courses: Course[]
  onNavigate: (view: View) => void
  onLogout: () => void
}

/** A professor + all their current-term subjects. */
interface ProfessorWithSubjects {
  professor: Professor
  subjects: Subject[]
}

// Subject-chip styles. Mirrors COLOR_STYLES in lib/schedule.ts
// (same dots + code text) but with softer borders suited to small
// chips. Full literal class strings so the Tailwind v4 JIT keeps
// them in the build.
const CHIP_STYLES: Record<CourseColor, { chip: string; dot: string; code: string }> = {
  blue: { chip: 'border-blue-200 bg-blue-50', dot: 'bg-blue-600', code: 'text-blue-700' },
  green: { chip: 'border-green-200 bg-green-50', dot: 'bg-green-600', code: 'text-green-700' },
  amber: { chip: 'border-amber-200 bg-amber-50', dot: 'bg-amber-500', code: 'text-amber-700' },
  violet: { chip: 'border-violet-200 bg-violet-50', dot: 'bg-violet-600', code: 'text-violet-700' },
  red: { chip: 'border-red-200 bg-red-50', dot: 'bg-red-500', code: 'text-red-700' },
}

export function ProfessorsPage({ student, professors, courses, onNavigate, onLogout }: ProfessorsPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Sidebar navigation — just delegate to onNavigate.
  const handleNavigate = (v: View) => {
    onNavigate(v)
  }

  // Current-term subjects
  const currentSubjects = useMemo(() =>
    student.subjects.filter((s) => s.academicYear === student.academicYear && s.semester === student.semester),
  [student.subjects, student.academicYear, student.semester])

  // Build professor → subjects map (dedupe: one card per professor)
  const professorCards = useMemo(() => {
    const map = new Map<string, ProfessorWithSubjects>()

    // First, seed the map with all professors that exist in the directory
    for (const prof of professors) {
      map.set(prof.name, { professor: prof, subjects: [] })
    }

    // Then, join current-term subjects by professor name
    for (const subj of currentSubjects) {
      let entry = map.get(subj.professor)
      if (!entry) {
        // Professor not in directory — create a minimal entry with
        // whatever info we have from the subject (email from subject).
        entry = {
          professor: {
            _id: '',
            name: subj.professor,
            email: subj.professorEmail || '',
            officeHours: 'Not available',
            room: 'Not available',
          },
          subjects: [],
        }
        map.set(subj.professor, entry)
      }
      entry.subjects.push(subj)
    }

    // Filter to only professors who teach at least one current-term subject
    const cards = Array.from(map.values()).filter((c) => c.subjects.length > 0)

    // Sort by first subject code
    cards.sort((a, b) => {
      const aCode = a.subjects[0]?.code || ''
      const bCode = b.subjects[0]?.code || ''
      return aCode.localeCompare(bCode)
    })

    return cards
  }, [professors, currentSubjects])

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active="professors"
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={() => onNavigate('profile')}
          onLogout={onLogout}
        />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 space-y-6">
          {/* Page header */}
          <div>
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Professors</h1>
            <p className="text-sm text-slate-500 mt-1">
              Your instructors for {student.semester} &bull; AY {student.academicYear}
            </p>
          </div>

          {/* Summary chips */}
          <div className="flex gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Professors</span>
              <span className="text-sm font-bold text-slate-900">{professorCards.length}</span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-slate-500">Subjects</span>
              <span className="text-sm font-bold text-slate-900">{currentSubjects.length}</span>
            </div>
          </div>

          {/* Empty state */}
          {professorCards.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm py-16 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No professors found for this term.</p>
            </div>
          ) : (
            <>
              {/* Professor card grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {professorCards.map(({ professor, subjects }) => (
                  <div
                    key={professor.name}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Card header — avatar + name + contact */}
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                        style={{ background: '#1e293b' }}
                        aria-hidden="true"
                      >
                        {getInitials(professor.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{professor.name}</p>
                        {professor.email && (
                          <a
                            href={`mailto:${professor.email}`}
                            className="text-xs text-blue-600 hover:underline truncate block"
                          >
                            {professor.email}
                          </a>
                        )}
                      </div>
                      {professor.email && (
                        <a
                          href={`mailto:${professor.email}`}
                          aria-label={`Email ${professor.name}`}
                          className="w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center flex-shrink-0"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Card body — subjects + office info */}
                    <div className="px-5 py-4 space-y-3">
                      {/* Subjects — color-coded chip + title + schedule/room */}
                      <div className="space-y-2">
                        {subjects.map((s) => {
                          const style = CHIP_STYLES[getCourse(s.code, courses).color]
                          const meta = [s.schedule, s.room].filter(Boolean).join(' \u00b7 ')
                          return (
                            <div
                              key={s.code}
                              className="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-0.5 items-center"
                            >
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border ${style.chip}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
                                <span className={`font-mono text-xs font-bold ${style.code}`}>{s.code}</span>
                              </span>
                              <span className="text-sm text-slate-700 truncate">{s.title}</span>
                              {meta && (
                                <>
                                  <span />
                                  <span className="text-[11px] text-slate-400 truncate">{meta}</span>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Office info strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Office hours</p>
                            <p className="text-xs font-medium text-slate-700 mt-0.5">{professor.officeHours}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Room</p>
                            <p className="text-xs font-medium text-slate-700 mt-0.5">{professor.room}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shared hint — once, below the grid */}
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                For paper submissions and consultations, please visit during office hours.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
