'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Landmark,
  Loader2,
  RotateCcw,
  Stamp,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '../portal/Modal'
import { PortalShell } from '../portal/PortalShell'
import type { AdminPageProps } from './admin-props'

// ============================================================
//  Admin Enrollment — registrar management
//
//  GET /api/admin/enrollment lists every record (school-wide read)
//  with the owning student's identity. PATCH overrides the step
//  tracker; POST posts payments against the assessment (own-branch
//  writes only). Everything renders through the shared Modal.
// ============================================================

interface EnrollmentStep {
  step: number
  label: string
  description: string
  status: 'completed' | 'current' | 'upcoming' | string
  date: string | null
}

interface PaymentEntry {
  amount: number
  date: string
  postedBy: string
  note: string | null
}

interface EnrollmentRecord {
  _id: string
  branch: string
  studentUsername: string
  academicYear: string
  semester: string
  currentStep: number
  steps: EnrollmentStep[]
  assessment: {
    totalAssessment: number
    amountPaid: number
    balance: number
    paymentStatus: 'paid' | 'partial' | 'unpaid' | string
    paymentDeadline: string | null
    paymentDate: string | null
  }
  payments: PaymentEntry[]
  student: {
    fullName: string
    studentNumber: string
    programShort: string
    yearLevel: string
    section: string
    enrollmentStatus: string
  } | null
}

const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function todayInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function PaymentPill({ status }: { status: string }) {
  const tone =
    status === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : status === 'partial'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-red-50 text-red-700 border-red-200'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${tone}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// Compact horizontal step tracker (mirrors the student page's model).
function StepTracker({ steps, currentStep }: { steps: EnrollmentStep[]; currentStep: number }) {
  return (
    <ol className="flex items-center gap-0 flex-wrap">
      {steps.map((s, i) => {
        const done = s.step < currentStep
        const current = s.step === currentStep
        return (
          <li key={s.step} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  done
                    ? 'bg-emerald-100 text-emerald-700'
                    : current
                      ? 'bg-[#153357] text-white'
                      : 'bg-slate-100 text-slate-600'
                }`}
                title={s.label}
              >
                {done ? <Check className="w-3 h-3" /> : s.step}
              </span>
              <span className={`text-[11px] font-medium hidden xl:inline ${current ? 'text-slate-900' : 'text-slate-500'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 ? <ChevronRight className="w-3 h-3 text-slate-300 mx-1" /> : null}
          </li>
        )
      })}
    </ol>
  )
}

const inputClass =
  'w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

export function AdminEnrollmentPage({ student, onNavigate, onLogout, events, professors, tasks, inbox }: AdminPageProps) {
  const [records, setRecords] = useState<EnrollmentRecord[]>([])
  const [withoutRecords, setWithoutRecords] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state: one of 'override' | 'payment' | 'view' at a time.
  const [overrideFor, setOverrideFor] = useState<EnrollmentRecord | null>(null)
  const [overrideStep, setOverrideStep] = useState(1)
  const [paymentFor, setPaymentFor] = useState<EnrollmentRecord | null>(null)
  const [viewFor, setViewFor] = useState<EnrollmentRecord | null>(null)

  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(todayInput())
  const [payNote, setPayNote] = useState('')
  const [busy, setBusy] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/enrollment')
      const data = await res.json()
      if (data.ok) {
        setRecords(data.records || [])
        setWithoutRecords(data.withoutRecords ?? 0)
      } else {
        setError(data.error || 'Failed to load enrollment records.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const totals = useMemo(() => {
    const assessment = records.reduce((sum, r) => sum + r.assessment.totalAssessment, 0)
    const paid = records.reduce((sum, r) => sum + r.assessment.amountPaid, 0)
    const balance = records.reduce((sum, r) => sum + r.assessment.balance, 0)
    return {
      assessment,
      paid,
      balance,
      paidCount: records.filter((r) => r.assessment.paymentStatus === 'paid').length,
      partialCount: records.filter((r) => r.assessment.paymentStatus === 'partial').length,
      unpaidCount: records.filter((r) => r.assessment.paymentStatus === 'unpaid').length,
    }
  }, [records])

  const openOverride = (r: EnrollmentRecord) => {
    setOverrideFor(r)
    setOverrideStep(r.currentStep)
  }

  const openPayment = (r: EnrollmentRecord) => {
    setPaymentFor(r)
    setPayAmount('')
    setPayDate(todayInput())
    setPayNote('')
  }

  const handleOverride = async () => {
    if (!overrideFor) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/enrollment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: overrideFor._id, currentStep: overrideStep }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Step tracker updated.')
        setOverrideFor(null)
        fetchRecords()
      } else {
        toast.error(data.error || 'Failed to override step tracker.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handlePayment = async () => {
    if (!paymentFor) return
    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a payment amount greater than zero.')
      return
    }
    if (amount > paymentFor.assessment.balance) {
      toast.error(`Payment exceeds the remaining balance (${peso.format(paymentFor.assessment.balance)}).`)
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/enrollment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: paymentFor._id, amount, date: payDate, note: payNote.trim() || undefined }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(data.message || 'Payment posted.')
        setPaymentFor(null)
        fetchRecords()
      } else {
        toast.error(data.error || 'Failed to post payment.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalShell
      student={student}
      active="admin-enrollment"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      inbox={inbox}
    >
      <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Enrollment</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registrar view — override step trackers and post payments against fee assessments.
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading enrollment records...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm px-6 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-sm text-red-600 font-medium mb-1">{error}</p>
            <button type="button" onClick={fetchRecords} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744]">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        ) : (
          <>
            {/* Summary strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Landmark className="w-4 h-4 text-blue-700" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Assessed</p>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{peso.format(totals.assessment)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{records.length} record{records.length === 1 ? '' : 's'}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Wallet className="w-4 h-4 text-emerald-600" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Collected</p>
                </div>
                <p className="mt-3 text-2xl font-bold text-emerald-700 tabular-nums">{peso.format(totals.paid)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{totals.paidCount} paid · {totals.partialCount} partial · {totals.unpaidCount} unpaid</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Outstanding</p>
                </div>
                <p className="mt-3 text-2xl font-bold text-red-600 tabular-nums">{peso.format(totals.balance)}</p>
                <p className="mt-0.5 text-xs text-slate-500">across all records</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Stamp className="w-4 h-4 text-amber-600" />
                  </span>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">No record yet</p>
                </div>
                <p className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{withoutRecords}</p>
                <p className="mt-0.5 text-xs text-slate-500">enrolled students without an enrollment record</p>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <Landmark className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">No enrollment records yet</p>
                <p className="text-xs text-slate-500 mt-1">Records appear when the registrar creates them per student per term.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[760px]">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Student</th>
                        <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Term</th>
                        <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Step tracker</th>
                        <th className="bg-slate-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Payment</th>
                        <th className="bg-slate-50 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r._id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{r.student?.fullName ?? r.studentUsername}</p>
                            <p className="text-xs text-slate-500">
                              {r.student?.studentNumber ? <span className="tabular-nums">{r.student.studentNumber} · </span> : null}
                              <span className="font-mono">{r.studentUsername}</span>
                            </p>
                            {r.student ? (
                              <p className="text-xs text-slate-500 mt-0.5">
                                {[r.student.programShort, r.student.yearLevel, r.student.section].filter(Boolean).join(' · ')}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                            <p className="font-medium">{r.academicYear}</p>
                            <p className="text-xs text-slate-500">{r.semester}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StepTracker steps={r.steps} currentStep={r.currentStep} />
                            <p className="text-xs text-slate-500 mt-1">
                              Step {r.currentStep} of {r.steps.length || '—'}
                              {r.steps[r.currentStep - 1]?.status === 'current' ? ` · ${r.steps[r.currentStep - 1].label}` : ''}
                            </p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <PaymentPill status={r.assessment.paymentStatus} />
                            <p className="text-xs text-slate-500 mt-1 tabular-nums">
                              Balance <span className="font-semibold text-slate-700">{peso.format(r.assessment.balance)}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 tabular-nums">
                              paid {peso.format(r.assessment.amountPaid)} of {peso.format(r.assessment.totalAssessment)}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openOverride(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                              <Stamp className="w-3.5 h-3.5" /> Override
                            </button>
                            <button
                              type="button"
                              onClick={() => openPayment(r)}
                              disabled={r.assessment.balance <= 0}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              title={r.assessment.balance <= 0 ? 'Fully paid' : 'Post a payment'}
                            >
                              <Wallet className="w-3.5 h-3.5" /> Payment
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewFor(r)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Override step tracker modal */}
      {overrideFor && (
        <Modal
          title="Override step tracker"
          description={`${overrideFor.student?.fullName ?? overrideFor.studentUsername} · ${overrideFor.academicYear} ${overrideFor.semester} — set where the tracker stands now.`}
          onClose={() => setOverrideFor(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setOverrideFor(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOverride}
                disabled={busy || overrideStep === overrideFor.currentStep}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#153357] text-white text-sm font-semibold hover:bg-[#0f2744] disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Set step {overrideStep}
              </button>
            </>
          }
        >
          <ol className="space-y-2">
            {overrideFor.steps.map((s) => {
              const selected = overrideStep === s.step
              const before = s.step < overrideStep
              return (
                <li key={s.step}>
                  <button
                    type="button"
                    onClick={() => setOverrideStep(s.step)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selected ? 'border-[#153357] bg-blue-50/60' : 'border-slate-200 hover:border-slate-300'
                    }`}
                    aria-pressed={selected}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          before ? 'bg-emerald-100 text-emerald-700' : selected ? 'bg-[#153357] text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {before ? <Check className="w-3 h-3" /> : s.step}
                      </span>
                      <span className="text-sm font-medium text-slate-800">{s.label}</span>
                      {selected ? (
                        <span className="ml-auto text-[11px] font-semibold text-[#153357]">current</span>
                      ) : before ? (
                        <span className="ml-auto text-[11px] font-semibold text-emerald-700">completed</span>
                      ) : (
                        <span className="ml-auto text-[11px] text-slate-500">upcoming</span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 pl-[30px]">{s.description}</p>
                  </button>
                </li>
              )
            })}
          </ol>
          <p className="text-[11px] text-slate-500 mt-3">
            Steps before the chosen one become completed, the chosen one becomes current, and the rest become upcoming — the student sees the same tracker immediately.
          </p>
        </Modal>
      )}

      {/* Post payment modal */}
      {paymentFor && (
        <Modal
          title="Post payment"
          description={`${paymentFor.student?.fullName ?? paymentFor.studentUsername} · ${paymentFor.academicYear} ${paymentFor.semester}`}
          onClose={() => setPaymentFor(null)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setPaymentFor(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayment}
                disabled={busy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Post {peso.format(Number(payAmount) || 0)}
              </button>
            </>
          }
        >
          <dl className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
            <div className="flex justify-between px-3 py-2">
              <dt className="text-slate-500">Total assessment</dt>
              <dd className="font-semibold text-slate-900 tabular-nums">{peso.format(paymentFor.assessment.totalAssessment)}</dd>
            </div>
            <div className="flex justify-between px-3 py-2">
              <dt className="text-slate-500">Already paid</dt>
              <dd className="font-semibold text-slate-700 tabular-nums">{peso.format(paymentFor.assessment.amountPaid)}</dd>
            </div>
            <div className="flex justify-between px-3 py-2">
              <dt className="text-slate-500">Remaining balance</dt>
              <dd className="font-semibold text-red-600 tabular-nums">{peso.format(paymentFor.assessment.balance)}</dd>
            </div>
          </dl>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div>
              <label htmlFor="pay-amount" className="block text-xs font-semibold text-slate-600 mb-1">
                Amount
              </label>
              <input
                id="pay-amount"
                type="number"
                min={1}
                max={paymentFor.assessment.balance}
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder={String(paymentFor.assessment.balance)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setPayAmount(String(paymentFor.assessment.balance))}
                className="mt-1.5 text-[11px] font-semibold text-blue-700 hover:underline"
              >
                Full balance ({peso.format(paymentFor.assessment.balance)})
              </button>
            </div>
            <div>
              <label htmlFor="pay-date" className="block text-xs font-semibold text-slate-600 mb-1">
                Received on
              </label>
              <input
                id="pay-date"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="pay-note" className="block text-xs font-semibold text-slate-600 mb-1">
              Note <span className="font-normal text-slate-500">(optional — e.g. receipt #, installment)</span>
            </label>
            <input
              id="pay-note"
              type="text"
              maxLength={200}
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              placeholder="OR-2026-00114"
              className={inputClass}
            />
          </div>
        </Modal>
      )}

      {/* Full record view modal */}
      {viewFor && (
        <Modal
          title={viewFor.student?.fullName ?? viewFor.studentUsername}
          description={`${viewFor.academicYear} ${viewFor.semester} · ${viewFor.branch} branch — full enrollment record.`}
          onClose={() => setViewFor(null)}
          maxWidthClass="max-w-2xl"
          footer={
            <button
              type="button"
              onClick={() => setViewFor(null)}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          }
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Step tracker</h4>
              <ol className="space-y-1.5">
                {viewFor.steps.map((s) => (
                  <li key={s.step} className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                        s.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : s.status === 'current'
                            ? 'bg-[#153357] text-white'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status === 'completed' ? <Check className="w-3 h-3" /> : s.step}
                    </span>
                    <span className={`text-sm font-medium ${s.status === 'current' ? 'text-slate-900' : 'text-slate-600'}`}>{s.label}</span>
                    <span className="ml-auto text-xs text-slate-500 tabular-nums">{formatDate(s.date)}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Assessment</h4>
              <dl className="rounded-lg border border-slate-200 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between px-3 py-2">
                  <dt className="text-slate-500">Total assessment</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">{peso.format(viewFor.assessment.totalAssessment)}</dd>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <dt className="text-slate-500">Paid</dt>
                  <dd className="font-semibold text-slate-700 tabular-nums">{peso.format(viewFor.assessment.amountPaid)}</dd>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <dt className="text-slate-500">Balance</dt>
                  <dd className="font-semibold text-red-600 tabular-nums">{peso.format(viewFor.assessment.balance)}</dd>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <dt className="text-slate-500">Status</dt>
                  <dd><PaymentPill status={viewFor.assessment.paymentStatus} /></dd>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <dt className="text-slate-500">Deadline</dt>
                  <dd className="text-slate-700 tabular-nums">{formatDate(viewFor.assessment.paymentDeadline)}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Payment history</h4>
              {viewFor.payments.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No posted payments yet — the paid amount above predates the payment log or was seeded.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {viewFor.payments.map((p, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span className="font-semibold text-slate-900 tabular-nums">{peso.format(p.amount)}</span>
                      <span className="text-xs text-slate-500 tabular-nums">{formatDate(p.date)}</span>
                      {p.note ? <span className="text-xs text-slate-500 truncate">· {p.note}</span> : null}
                      <span className="ml-auto text-[11px] text-slate-500 font-mono">{p.postedBy}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Modal>
      )}
    </PortalShell>
  )
}
