'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ShieldCheck,
  Star,
  GraduationCap,
  Phone,
  Users,
  Eye,
  FileText,
  CircleCheck,
  CircleAlert,
  Download,
  Printer,
  Info,
  Pencil,
  type LucideIcon,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import { getInitials } from '@/lib/aics/format'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { COEModal } from './COEModal'
import { DigitalIDCardLarge } from './DigitalIDCardLarge'

interface StudentProfileProps {
  student: Student
  onBack: () => void
  onLogout: () => void
}

// Stagger config for section entrance animation
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
}

export function StudentProfile({ student, onBack, onLogout }: StudentProfileProps) {
  const [showCOE, setShowCOE] = useState(false)
  const [showIDDialog, setShowIDDialog] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)
  const submittedDocs = student.documents.filter((d) => d.submitted).length

  const handleNavigate = (v: View) => {
    if (v === 'dashboard') onBack()
  }

  const handleProfile = () => {
    // Already on profile — no-op
  }

  const handleEditProfile = () => {
    toast.info('Profile editing is coming soon.')
  }

  const handleSubmitDocument = () => {
    toast.info('Document upload is coming soon.')
  }

  const handleViewAllDocuments = () => {
    toast.info('Documents page is coming soon.')
  }

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active="profile"
        onNavigate={handleNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={handleProfile}
          onLogout={onLogout}
        />

        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* ===================== PAGE HEADER ===================== */}
            <motion.div variants={sectionVariants} transition={{ duration: 0.35 }}>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold tracking-tight text-ink mt-3">My Profile</h1>
              <p className="text-sm text-muted mt-1">
                Manage your student information, identification, and documents.
              </p>
            </motion.div>

            {/* ===================== PROFILE HERO CARD ===================== */}
            <motion.div variants={sectionVariants} transition={{ duration: 0.35 }}>
              <div className="bg-white rounded-2xl border border-line shadow-sm p-6">
                {/* Top row: avatar + name + chips */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="size-16 rounded-full bg-gradient-to-br from-brand-800 to-brand-600 text-white text-xl font-bold flex items-center justify-center flex-shrink-0">
                      {getInitials(student.fullName)}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-ink break-words">{student.fullName}</h2>
                      <p className="text-sm text-muted font-mono mt-0.5">{student.studentNumber}</p>
                      <p className="text-sm text-muted mt-0.5">{student.program}</p>
                      <p className="text-sm text-muted mt-0.5">
                        {student.yearLevel} &bull; {student.section}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-success-bg text-success-text border border-success-border">
                      <ShieldCheck className="w-3.5 h-3.5" /> Enrolled
                    </span>
                    {student.deanLister && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-brand-50 border border-brand-200 text-brand-700">
                        <Star className="w-3.5 h-3.5" /> Dean&rsquo;s Lister
                      </span>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-6 border-t border-line" />

                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-4 md:divide-x divide-line">
                  <StatCell label="GPA" value={student.gpa} />
                  <StatCell label="Units Enrolled" value={String(totalUnits)} />
                  <StatCell label="Subjects" value={String(student.subjects.length)} />
                  <StatCell
                    label="Standing"
                    value={student.deanLister ? "Dean's Lister" : 'Regular'}
                  />
                </div>
              </div>
            </motion.div>

            {/* ===================== ROW 2: Personal Info + Digital ID ===================== */}
            <motion.div
              variants={sectionVariants}
              transition={{ duration: 0.35 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Personal Information (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-line shadow-sm min-w-0">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold text-ink">Personal Information</h3>
                </div>
                <div className="border-t border-line" />

                <div className="p-6 space-y-6">
                  {/* Academic Information */}
                  <SubSection icon={GraduationCap} title="Academic Information">
                    <Field label="Program" value={student.program} />
                    <Field
                      label="Year & Section"
                      value={`${student.yearLevel}, ${student.section}`}
                    />
                    <Field label="Branch" value={student.branch} />
                    <Field
                      label="Semester"
                      value={`${student.semester}, AY ${student.academicYear}`}
                    />
                    <Field label="Enrollment Status" value={student.enrollmentStatus} />
                    <Field
                      label="Standing"
                      value={student.deanLister ? "Dean's Lister" : 'Regular'}
                    />
                  </SubSection>

                  {/* Contact Information */}
                  <div className="border-t border-line pt-6">
                    <SubSection icon={Phone} title="Contact Information">
                      <Field label="Email" value={student.email} />
                      <Field label="Contact Number" value={student.phone} />
                      <div className="sm:col-span-2">
                        <Field label="Address" value={student.address} />
                      </div>
                    </SubSection>
                  </div>

                  {/* Emergency Contact */}
                  <div className="border-t border-line pt-6">
                    <SubSection icon={Users} title="Emergency Contact">
                      <Field label="Name" value={student.emergencyContactName} />
                      <Field label="Contact Number" value={student.emergencyContactNumber} />
                    </SubSection>
                  </div>
                </div>
              </div>

              {/* Digital ID (1 col) */}
              <div className="bg-white rounded-2xl border border-line shadow-sm">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold text-ink">Digital ID</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Your official student identification
                  </p>
                </div>
                <div className="border-t border-line" />
                <div className="p-6 space-y-4">
                  <DigitalIDCardMini student={student} />
                  <Button
                    variant="outline"
                    className="w-full rounded-lg"
                    onClick={() => setShowIDDialog(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" /> View Digital ID
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* ===================== ROW 3: Documents + COE ===================== */}
            <motion.div
              variants={sectionVariants}
              transition={{ duration: 0.35 }}
              className="grid lg:grid-cols-3 gap-6"
            >
              {/* Submitted Documents (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-line shadow-sm min-w-0">
                <div className="p-6 pb-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-ink">Submitted Documents</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {submittedDocs} of {student.documents.length} documents submitted
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg flex-shrink-0"
                    onClick={handleViewAllDocuments}
                  >
                    <FileText className="w-4 h-4 mr-1.5" /> View All
                  </Button>
                </div>
                <div className="border-t border-line" />
                <ul className="divide-y divide-line">
                  {student.documents.map((doc, i) => (
                    <DocumentRow
                      key={i}
                      name={doc.name}
                      submitted={doc.submitted}
                      dateSubmitted={doc.dateSubmitted}
                      onSubmit={handleSubmitDocument}
                    />
                  ))}
                </ul>
              </div>

              {/* Certificate of Enrollment (1 col) */}
              <div className="bg-white rounded-2xl border border-line shadow-sm">
                <div className="p-6 pb-4">
                  <h3 className="text-lg font-semibold text-ink">Certificate of Enrollment</h3>
                  <p className="text-xs text-muted mt-0.5">
                    Preview, print, or download your COE for this semester.
                  </p>
                </div>
                <div className="border-t border-line" />
                <div className="p-6 space-y-3">
                  {/* Illustration */}
                  <div className="flex justify-center py-2">
                    <div className="size-24 rounded-full bg-brand-100 flex items-center justify-center">
                      <svg
                        className="w-12 h-12 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden="true"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                        <path d="M9 13h6" />
                        <path d="M9 17h6" />
                        <path d="M3 12a9 9 0 0 0 9 9" />
                      </svg>
                    </div>
                  </div>

                  <Button
                    className="w-full rounded-lg bg-brand-700 hover:bg-brand-800 text-white"
                    onClick={() => setShowCOE(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" /> Preview Certificate
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-lg"
                    onClick={() => {
                      setShowCOE(true)
                      setTimeout(() => window.print(), 600)
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-lg"
                    onClick={() => {
                      setShowCOE(true)
                      setTimeout(() => window.print(), 600)
                    }}
                  >
                    <Printer className="w-4 h-4 mr-2" /> Print Certificate
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* ===================== BOTTOM BANNER ===================== */}
            <motion.div variants={sectionVariants} transition={{ duration: 0.35 }}>
              <div className="rounded-xl bg-brand-50 border border-brand-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="size-9 rounded-full bg-white border border-brand-200 text-brand-600 flex items-center justify-center flex-shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">
                    Keep your information up to date
                  </p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Ensure your personal information and documents are accurate and complete for a
                    smooth academic experience.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="rounded-lg flex-shrink-0"
                  onClick={handleEditProfile}
                >
                  <Pencil className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>

      {/* COE Modal */}
      <AnimatePresence>
        {showCOE && <COEModal student={student} onClose={() => setShowCOE(false)} />}
      </AnimatePresence>

      {/* Digital ID Dialog */}
      <Dialog open={showIDDialog} onOpenChange={setShowIDDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Digital ID</DialogTitle>
          </DialogHeader>
          <DigitalIDCardLarge student={student} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
//  Sub-components
// ============================================================

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center py-3 px-2">
      <p className="text-[11px] uppercase tracking-wider text-muted font-medium">{label}</p>
      <p className="text-lg font-bold text-brand-600 mt-1">{value}</p>
    </div>
  )
}

function SubSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="size-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <h4 className="text-sm font-semibold text-brand-600">{title}</h4>
      </div>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-semibold text-ink mt-0.5 break-words">{value}</p>
    </div>
  )
}

function DocumentRow({
  name,
  submitted,
  dateSubmitted,
  onSubmit,
}: {
  name: string
  submitted: boolean
  dateSubmitted: string | null
  onSubmit: () => void
}) {
  return (
    <li className="px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {submitted ? (
          <CircleCheck className="w-5 h-5 text-success-icon flex-shrink-0" />
        ) : (
          <CircleAlert className="w-5 h-5 text-danger-text flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{name}</p>
          <p
            className={`text-xs mt-0.5 ${
              submitted ? 'text-muted' : 'text-danger-text'
            }`}
          >
            {submitted
              ? `Submitted on ${dateSubmitted}`
              : 'Required for enrollment'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {submitted ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-success-bg text-success-text border border-success-border">
            Submitted
          </span>
        ) : (
          <>
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-danger-bg text-danger-text border border-danger-border">
              Pending
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={onSubmit}
            >
              Submit
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

// ============================================================
//  Compact Digital ID Card (for the profile sidebar)
// ============================================================

function DigitalIDCardMini({ student }: { student: Student }) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-md bg-gradient-to-br from-[#1E3A8A] via-[#1D4ED8] to-[#3B82F6]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src="/aics-logo.svg" alt="AICS" className="w-7 h-7" />
          <p className="text-[10px] uppercase tracking-wider text-white/80 font-semibold leading-tight">
            Asian Institute of<br />Computer Studies
          </p>
        </div>
        <span className="bg-sky-300 text-blue-900 text-[10px] font-bold rounded-full px-2 py-0.5 uppercase tracking-wider">
          Student ID
        </span>
      </div>

      {/* Body */}
      <div className="flex gap-3 mb-4">
        <div className="size-14 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-lg font-bold flex-shrink-0">
          {getInitials(student.fullName)}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <p className="text-[8px] uppercase tracking-wider text-white/60">Name</p>
            <p className="text-sm font-bold text-white break-words leading-tight">
              {student.fullName}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-white/60">Student No.</p>
            <p className="text-[11px] font-mono font-semibold text-white">
              {student.studentNumber}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-white/60">Program</p>
            <p className="text-[10px] font-semibold text-white">
              {student.programShort} &ndash; {student.yearLevel}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mb-3 text-[9px]">
        <div>
          <p className="uppercase tracking-wider text-white/60">Branch</p>
          <p className="font-semibold text-white">{student.branch}</p>
        </div>
        <div className="text-right">
          <p className="uppercase tracking-wider text-white/60">Valid</p>
          <p className="font-semibold text-white">AY {student.academicYear}</p>
        </div>
      </div>

      {/* Barcode */}
      <div
        className="h-8 w-full rounded"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #ffffff 0px, #ffffff 2px, transparent 2px, transparent 4px, #ffffff 4px, #ffffff 5px, transparent 5px, transparent 8px, #ffffff 8px, #ffffff 10px, transparent 10px, transparent 12px)',
        }}
        aria-hidden="true"
      />
      <p className="text-[9px] text-white/70 mt-1 text-center font-mono">
        {student.studentNumber}
      </p>
    </div>
  )
}
