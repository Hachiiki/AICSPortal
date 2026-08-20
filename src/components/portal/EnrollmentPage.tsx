'use client'

import { useState } from 'react'
import {
  ChevronRight,
  Check,
  Stamp,
  Wallet,
  ListChecks,
  Phone,
  Mail,
  Clock,
  MapPin,
  AlertCircle,
  CalendarClock,
  Info,
} from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import type { Enrollment, EnrollmentStep, PaymentStatus } from '@/lib/aics/enrollment'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// ============================================================
//  EnrollmentPage — current-term enrollment tracker.
//
//  Shows the student's progress through the 5 enrollment
//  steps (Pre-enrollment → Assessment → Payment → Enrolled →
//  Add/Drop), the official assessment of fees (with payment
//  status), the requirements checklist (reused from
//  student.documents), and the Registrar contact card.
//
//  ADMIN/REGISTRAR CONTROL: Enrollment steps, assessment of
//  fees, payment status, and registrar contact info are
//  maintained by the Registrar / Admin. Students have
//  read-only access via this page.
// ============================================================

interface EnrollmentPageProps {
  student: Student
  enrollment: Enrollment | null
  enrollmentLoading: boolean
  enrollmentError: string | null
  onNavigate: (view: View) => void
  onLogout: () => void
  // Search index collections — lifted in the parent so the
  // Topbar's global search works the same on every screen.
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
}

// Peso formatter — used for all monetary values on this page.
const formatPeso = (amount: number) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount)

// Status → color tokens for the enrollment step circles.
const STEP_STYLES = {
  completed: {
    circle: { background: '#16a34a', color: '#ffffff', borderColor: '#16a34a' },
    label: { color: '#0f172a' },
    sublabel: { color: '#16a34a' },
    connector: '#16a34a',
    pill: { background: '#dcfce7', color: '#15803d' },
  },
  current: {
    circle: { background: '#1e40af', color: '#ffffff', borderColor: '#1e40af' },
    label: { color: '#0f172a' },
    sublabel: { color: '#1e40af' },
    connector: '#cbd5e1',
    pill: { background: '#dbeafe', color: '#1d4ed8' },
  },
  upcoming: {
    circle: { background: '#ffffff', color: '#94a3b8', borderColor: '#cbd5e1' },
    label: { color: '#64748b' },
    sublabel: { color: '#94a3b8' },
    connector: '#e2e8f0',
    pill: { background: '#f1f5f9', color: '#64748b' },
  },
} as const

// Payment status → color tokens + label.
const PAYMENT_STYLES: Record<
  PaymentStatus,
  { label: string; pill: { background: string; color: string } }
> = {
  paid: { label: 'Fully Paid', pill: { background: '#dcfce7', color: '#15803d' } },
  partial: { label: 'Partial Payment', pill: { background: '#fef3c7', color: '#b45309' } },
  unpaid: { label: 'Unpaid', pill: { background: '#fee2e2', color: '#b91c1c' } },
}

function StatusPill({
  status,
}: {
  status: EnrollmentStep['status']
}) {
  const labels: Record<EnrollmentStep['status'], string> = {
    completed: 'Completed',
    current: 'Current',
    upcoming: 'Upcoming',
  }
  const style = STEP_STYLES[status]
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider"
      style={style.pill}
    >
      {labels[status]}
    </span>
  )
}

function StepTracker({ steps, currentStep }: { steps: EnrollmentStep[]; currentStep: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Enrollment Progress</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Step {currentStep} of {steps.length} — {steps.find((s) => s.status === 'current')?.label || 'In Progress'}
          </p>
        </div>
        <Stamp className="w-5 h-5 text-blue-600 flex-shrink-0" />
      </div>

      {/* Desktop / tablet horizontal tracker — compact, no descriptions */}
      <div className="hidden md:block px-6 py-6">
        <div className="flex items-start">
          {steps.map((s, i) => {
            const style = STEP_STYLES[s.status]
            const isLast = i === steps.length - 1
            return (
              <div
                key={s.step}
                className="flex-1 flex flex-col items-center relative"
                style={{ minWidth: 0 }}
              >
                {/* Top row: circle + connector */}
                <div className="w-full flex items-center">
                  {/* Left connector (line to previous step) */}
                  {i > 0 && (
                    <div
                      className="flex-1 h-0.5"
                      style={{ background: STEP_STYLES[steps[i - 1].status].connector }}
                      aria-hidden="true"
                    />
                  )}
                  {/* Circle */}
                  <div
                    className="w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 mx-1"
                    style={style.circle}
                    aria-label={`Step ${s.step}: ${s.label} (${s.status})`}
                  >
                    {s.status === 'completed' ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-bold">{s.step}</span>
                    )}
                  </div>
                  {/* Right connector (line to next step) */}
                  {!isLast && (
                    <div
                      className="flex-1 h-0.5"
                      style={{ background: style.connector }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Label + status only (no description here — it gets its own section below) */}
                <div className="mt-3 text-center px-1 w-full">
                  <p className="text-xs font-semibold" style={style.label}>
                    {s.label}
                  </p>
                  <div className="mt-1.5 flex flex-col items-center gap-1">
                    <StatusPill status={s.status} />
                    {s.date && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(s.date).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step detail list — full descriptions, readable */}
      <div className="hidden md:block border-t border-slate-100">
        <div className="px-6 py-4 grid grid-cols-3 gap-x-4 gap-y-3">
          {steps.map((s) => {
            const style = STEP_STYLES[s.status]
            return (
              <div key={s.step} className="flex items-start gap-2.5">
                <span className="text-[10px] font-bold mt-0.5 flex-shrink-0" style={style.sublabel}>
                  {s.step}.
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={style.label}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    {s.description}
                  </p>
                </div>
              </div>
            )
          })}
          {/* Fill the grid if odd number of steps */}
          {steps.length % 3 !== 0 && <div />}
        </div>
      </div>

      {/* Mobile vertical tracker */}
      <div className="md:hidden px-5 py-5 divide-y divide-slate-100">
        {steps.map((s) => {
          const style = STEP_STYLES[s.status]
          return (
            <div key={s.step} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <div
                className="w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                style={style.circle}
              >
                {s.status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-bold">{s.step}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold" style={style.label}>
                    {s.label}
                  </p>
                  <StatusPill status={s.status} />
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {s.description}
                </p>
                {s.date && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    {new Date(s.date).toLocaleDateString('en-PH', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AssessmentCard({ enrollment }: { enrollment: Enrollment }) {
  const a = enrollment.assessment
  const payment = PAYMENT_STYLES[a.paymentStatus]
  const miscTotal = a.miscFees.reduce((sum, f) => sum + f.amount, 0)

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Assessment of Fees</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {enrollment.semester} &bull; AY {enrollment.academicYear}
          </p>
        </div>
        <Wallet className="w-5 h-5 text-blue-600 flex-shrink-0" />
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Tuition row */}
        <div>
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Tuition</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {a.totalUnits} units &times; {formatPeso(a.tuitionPerUnit)}/unit
              </p>
            </div>
            <p className="text-sm font-bold text-slate-900 whitespace-nowrap">
              {formatPeso(a.tuitionAmount)}
            </p>
          </div>
        </div>

        {/* Misc fees */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Miscellaneous Fees
          </p>
          <div className="space-y-1.5">
            {a.miscFees.map((f) => (
              <div key={f.description} className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-700">{f.description}</p>
                <p className="text-sm text-slate-600 whitespace-nowrap">
                  {formatPeso(f.amount)}
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 pt-2 mt-2 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500">Miscellaneous subtotal</p>
              <p className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                {formatPeso(miscTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Total + payment summary */}
        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-4 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              Total Assessment
            </p>
            <p className="text-lg font-bold text-slate-900 whitespace-nowrap">
              {formatPeso(a.totalAssessment)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Amount Paid</p>
            <p className="text-sm font-semibold text-green-700 whitespace-nowrap">
              {formatPeso(a.amountPaid)}
            </p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Outstanding Balance</p>
            <p className="text-sm font-semibold text-red-700 whitespace-nowrap">
              {formatPeso(a.balance)}
            </p>
          </div>
          <div className="pt-2.5 mt-1 border-t border-slate-200 flex items-center justify-between gap-3">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider"
              style={payment.pill}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: payment.pill.color }}
                aria-hidden="true"
              />
              {payment.label}
            </span>
            {a.paymentDeadline && (
              <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                Due{' '}
                {new Date(a.paymentDeadline).toLocaleDateString('en-PH', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
        </div>

        {a.paymentDate && (
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
            Last payment posted on{' '}
            {new Date(a.paymentDate).toLocaleDateString('en-PH', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            .
          </p>
        )}
      </div>
    </div>
  )
}

function RequirementsChecklist({ student }: { student: Student }) {
  const docs = student.documents
  const submitted = docs.filter((d) => d.submitted).length
  const total = docs.length
  const allComplete = submitted === total

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Requirements Checklist</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {submitted} of {total} submitted
          </p>
        </div>
        <ListChecks className="w-5 h-5 text-blue-600 flex-shrink-0" />
      </div>

      {docs.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <ListChecks className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No requirements on file.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {docs.map((d) => (
            <li key={d.name} className="px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={
                    d.submitted
                      ? { background: '#dcfce7', color: '#15803d' }
                      : { background: '#fee2e2', color: '#b91c1c' }
                  }
                  aria-hidden="true"
                >
                  {d.submitted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                </div>
                <p className="text-sm text-slate-700 truncate">{d.name}</p>
              </div>
              <p
                className="text-xs font-medium whitespace-nowrap"
                style={d.submitted ? { color: '#15803d' } : { color: '#b91c1c' }}
              >
                {d.submitted
                  ? d.dateSubmitted || 'Submitted'
                  : 'Pending'}
              </p>
            </li>
          ))}
        </ul>
      )}

      {docs.length > 0 && (
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
          <p className="text-[11px] text-slate-500">
            {allComplete
              ? 'All requirements submitted. You are cleared for enrollment.'
              : 'Some requirements are still pending. Please submit them at the Registrar\u2019s Office.'}
          </p>
        </div>
      )}
    </div>
  )
}

function RegistrarCard({ enrollment }: { enrollment: Enrollment }) {
  const r = enrollment.registrar
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-20">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: '#1e293b', color: '#ffffff' }}
          aria-hidden="true"
        >
          <Stamp className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            Registrar
          </p>
          <p className="text-sm font-bold text-slate-900 truncate">{r.name}</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Office
            </p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{r.room}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Office Hours
            </p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{r.officeHours}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Mail className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Email
            </p>
            <a
              href={`mailto:${r.email}`}
              className="text-xs font-medium text-blue-600 hover:underline mt-0.5 block truncate"
            >
              {r.email}
            </a>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Phone className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
              Phone
            </p>
            <p className="text-xs font-medium text-slate-700 mt-0.5">{r.phone}</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          For enrollment concerns, payment plans, and subject load adjustments,
          please visit or contact the Registrar&apos;s Office during office hours.
        </p>
      </div>
    </div>
  )
}

function LoadingShell() {
  return (
    <div className="space-y-6">
      {/* Step tracker skeleton */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="aics-skeleton h-4 w-44 rounded" />
        </div>
        <div className="px-6 py-6">
          <div className="flex items-start">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full aics-skeleton" />
                <div className="mt-3 w-full text-center">
                  <div className="aics-skeleton h-3 w-16 mx-auto rounded" />
                  <div className="aics-skeleton h-2.5 w-full mt-2 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="aics-skeleton h-4 w-40 rounded" />
          <div className="aics-skeleton h-4 w-full rounded" />
          <div className="aics-skeleton h-4 w-3/4 rounded" />
          <div className="aics-skeleton h-20 w-full rounded-lg" />
        </div>
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="aics-skeleton h-4 w-24 rounded" />
          <div className="aics-skeleton h-4 w-full rounded" />
          <div className="aics-skeleton h-4 w-2/3 rounded" />
        </div>
      </div>
    </div>
  )
}

export function EnrollmentPage({
  student,
  enrollment,
  enrollmentLoading,
  enrollmentError,
  onNavigate,
  onLogout,
  events,
  professors,
  tasks,
}: EnrollmentPageProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleNavigate = (v: View) => onNavigate(v)

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active="enrollment"
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
          onNavigate={onNavigate}
          events={events}
          professors={professors}
          tasks={tasks}
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Enrollment</h1>
            <p className="text-sm text-slate-500 mt-1">
              {student.semester} &bull; AY {student.academicYear}
            </p>
          </div>

          {/* Error state */}
          {enrollmentError ? (
            <div className="bg-white rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
              <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
              <p className="text-sm text-red-600 font-medium mb-1">
                {enrollmentError}
              </p>
              <p className="text-xs text-slate-500">
                Please try again later or contact the Registrar&apos;s Office.
              </p>
            </div>
          ) : enrollmentLoading ? (
            <LoadingShell />
          ) : !enrollment ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
              <Stamp className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                No enrollment record found for this term.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                If you believe this is an error, please contact the Registrar&apos;s Office.
              </p>
            </div>
          ) : (
            <>
              {/* Step tracker (full width) */}
              <StepTracker
                steps={enrollment.steps}
                currentStep={enrollment.currentStep}
              />

              {/* Two-column grid: left = assessment + requirements, right = registrar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <AssessmentCard enrollment={enrollment} />
                  <RequirementsChecklist student={student} />
                </div>
                <div className="lg:col-span-1">
                  <RegistrarCard enrollment={enrollment} />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
