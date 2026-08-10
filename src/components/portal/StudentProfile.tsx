'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  User,
  IdCard,
  GraduationCap,
  BookOpen,
  Building2,
  MapPin,
  Phone,
  Mail,
  Contact,
  CalendarDays,
  Award,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileText,
  ClipboardList,
  Eye,
  Printer,
  Download,
} from 'lucide-react'
import type { Student, View } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { getInitials } from '@/lib/aics/format'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { InfoRow } from './InfoRow'
import { DigitalIDCard } from './DigitalIDCard'
import { COEModal } from './COEModal'

interface StudentProfileProps {
  student: Student
  onBack: () => void
  onLogout: () => void
}

/**
 * The student profile page. Uses the same Sidebar + Topbar shell as
 * the dashboard so navigation stays consistent across the portal.
 *
 * Shows a header card with avatar and badges, quick stats, personal
 * information grid, digital ID card preview, submitted documents
 * list, and the Certificate of Enrollment section with
 * preview/print/download actions.
 */
export function StudentProfile({ student, onBack, onLogout }: StudentProfileProps) {
  const [showCOE, setShowCOE] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)
  const submittedDocs = student.documents.filter((d) => d.submitted).length

  // Sidebar navigation — only Dashboard is enabled. Clicking it
  // returns to the dashboard. Profile is the current page.
  const handleNavigate = (v: View) => {
    if (v === 'dashboard') {
      onBack()
    }
    // 'profile' is the current page — no-op.
    // All other items are disabled "coming soon" in the sidebar.
  }

  // Topbar profile dropdown — "Profile" is the current page (no-op),
  // "Sign out" logs out.
  const handleProfile = () => {
    // Already on the profile page — no-op.
  }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active="profile"
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      {/* Main column — offset by sidebar width on desktop */}
      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={handleProfile}
          onLogout={onLogout}
        />

        <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
          {/* Back button */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
            style={{ color: PALETTE.ocean }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          {/* Profile header */}
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ border: `1px solid ${PALETTE.mist}55` }}
          >
            <div
              className="h-24"
              style={{
                background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.ocean} 100%)`,
              }}
            />
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${PALETTE.ocean}, ${PALETTE.azure})` }}
                >
                  {getInitials(student.fullName)}
                </div>
                <div className="flex-1 pb-1">
                  <h1 className="text-xl font-bold" style={{ color: PALETTE.navy }}>
                    {student.fullName}
                  </h1>
                  <p className="text-sm" style={{ color: '#6b7280' }}>
                    {student.studentNumber} &bull; {student.program}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${PALETTE.sky}26`, color: PALETTE.ocean }}
                    >
                      <CheckCircle2 className="w-3 h-3" /> {student.enrollmentStatus}
                    </span>
                    {student.deanLister && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                        style={{ background: `${PALETTE.sky}40`, color: PALETTE.ocean }}
                      >
                        <Award className="w-3 h-3" /> Dean&apos;s Lister
                      </span>
                    )}
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ background: `${PALETTE.mist}55`, color: PALETTE.navy }}
                    >
                      <BookOpen className="w-3 h-3" /> {student.yearLevel}, {student.section}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              className="bg-white rounded-xl p-4 shadow-sm"
              style={{ border: `1px solid ${PALETTE.mist}55` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-4 h-4" style={{ color: PALETTE.azure }} />
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  GPA
                </p>
              </div>
              <p className="text-xl font-bold" style={{ color: PALETTE.navy }}>
                {student.gpa}
              </p>
            </div>
            <div
              className="bg-white rounded-xl p-4 shadow-sm"
              style={{ border: `1px solid ${PALETTE.mist}55` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4" style={{ color: PALETTE.azure }} />
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Units
                </p>
              </div>
              <p className="text-xl font-bold" style={{ color: PALETTE.navy }}>
                {totalUnits}
              </p>
            </div>
            <div
              className="bg-white rounded-xl p-4 shadow-sm"
              style={{ border: `1px solid ${PALETTE.mist}55` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4" style={{ color: PALETTE.azure }} />
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Documents
                </p>
              </div>
              <p className="text-xl font-bold" style={{ color: PALETTE.navy }}>
                {submittedDocs}/{student.documents.length}
              </p>
            </div>
            <div
              className="bg-white rounded-xl p-4 shadow-sm"
              style={{ border: `1px solid ${PALETTE.mist}55` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4" style={{ color: PALETTE.azure }} />
                <p className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>
                  Standing
                </p>
              </div>
              <p
                className="text-sm font-bold"
                style={{ color: student.deanLister ? PALETTE.ocean : PALETTE.navy }}
              >
                {student.deanLister ? "Dean's Lister" : 'Regular'}
              </p>
            </div>
          </div>

          {/* Personal info + Digital ID */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal info (2 cols) */}
            <div
              className="lg:col-span-2 bg-white rounded-2xl shadow-sm"
              style={{ border: `1px solid ${PALETTE.mist}55` }}
            >
              <div className="p-6 border-b" style={{ borderColor: `${PALETTE.mist}55` }}>
                <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                  Personal Information
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                  Your academic and contact details on file
                </p>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <InfoRow icon={User} label="Full Name" value={student.fullName} />
                <InfoRow icon={IdCard} label="Student Number" value={student.studentNumber} />
                <InfoRow icon={GraduationCap} label="Program" value={student.program} />
                <InfoRow
                  icon={BookOpen}
                  label="Year & Section"
                  value={`${student.yearLevel}, ${student.section}`}
                />
                <InfoRow icon={Building2} label="Branch" value={student.branch} />
                <InfoRow icon={MapPin} label="Address" value={student.address} />
                <InfoRow icon={Phone} label="Contact Number" value={student.phone} />
                <InfoRow icon={Mail} label="Email" value={student.email} />
                <InfoRow
                  icon={Contact}
                  label="Emergency Contact"
                  value={`${student.emergencyContactName} — ${student.emergencyContactNumber}`}
                />
                <InfoRow
                  icon={CalendarDays}
                  label="Semester"
                  value={`${student.semester}, AY ${student.academicYear}`}
                />
                <InfoRow
                  icon={Award}
                  label="Dean's Lister"
                  value={student.deanLister ? `Yes — ${student.deanListerSemester}` : 'No'}
                />
                <InfoRow
                  icon={CheckCircle2}
                  label="Enrollment Status"
                  value={student.enrollmentStatus}
                />
              </div>
            </div>

            {/* Digital ID (1 col) */}
            <div
              className="bg-white rounded-2xl shadow-sm"
              style={{ border: `1px solid ${PALETTE.mist}55` }}
            >
              <div className="p-6 border-b" style={{ borderColor: `${PALETTE.mist}55` }}>
                <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                  Digital ID
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                  Your student identification card
                </p>
              </div>
              <div className="p-6">
                <DigitalIDCard student={student} />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div
            className="bg-white rounded-2xl shadow-sm"
            style={{ border: `1px solid ${PALETTE.mist}55` }}
          >
            <div
              className="p-6 border-b flex items-center gap-3"
              style={{ borderColor: `${PALETTE.mist}55` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${PALETTE.sky}26` }}
              >
                <ClipboardList className="w-5 h-5" style={{ color: PALETTE.ocean }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                  Submitted Documents
                </h2>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  {submittedDocs} of {student.documents.length} documents submitted
                </p>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: `${PALETTE.mist}33` }}>
              {student.documents.map((doc, i) => (
                <div
                  key={i}
                  className="px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {doc.submitted ? (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: `${PALETTE.sky}26` }}
                      >
                        <CheckCircle2 className="w-5 h-5" style={{ color: PALETTE.ocean }} />
                      </div>
                    ) : (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: '#fef2f2' }}
                      >
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium" style={{ color: PALETTE.navy }}>
                        {doc.name}
                      </p>
                      {doc.dateSubmitted && (
                        <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                          Submitted on {doc.dateSubmitted}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: doc.submitted ? `${PALETTE.sky}26` : '#fef2f2',
                      color: doc.submitted ? PALETTE.ocean : '#dc2626',
                    }}
                  >
                    {doc.submitted ? 'Submitted' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Certificate of Enrollment */}
          <div
            className="bg-white rounded-2xl shadow-sm"
            style={{ border: `1px solid ${PALETTE.mist}55` }}
          >
            <div
              className="p-6 border-b flex items-center gap-3"
              style={{ borderColor: `${PALETTE.mist}55` }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${PALETTE.sky}26` }}
              >
                <FileText className="w-5 h-5" style={{ color: PALETTE.ocean }} />
              </div>
              <div>
                <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                  Certificate of Enrollment
                </h2>
                <p className="text-xs" style={{ color: '#6b7280' }}>
                  Preview, print, or download your COE for this semester
                </p>
              </div>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowCOE(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${PALETTE.ocean}, ${PALETTE.azure})` }}
              >
                <Eye className="w-4 h-4" /> Preview COE
              </button>
              <button
                onClick={() => {
                  setShowCOE(true)
                  setTimeout(() => window.print(), 600)
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-gray-50"
                style={{ border: `1px solid ${PALETTE.mist}`, color: PALETTE.navy }}
              >
                <Printer className="w-4 h-4" /> Print
              </button>
              <button
                onClick={() => {
                  setShowCOE(true)
                  setTimeout(() => window.print(), 600)
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-gray-50"
                style={{ border: `1px solid ${PALETTE.mist}`, color: PALETTE.navy }}
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* COE Modal */}
      <AnimatePresence>
        {showCOE && <COEModal student={student} onClose={() => setShowCOE(false)} />}
      </AnimatePresence>
    </div>
  )
}
