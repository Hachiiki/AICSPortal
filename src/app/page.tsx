'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanFace,
  Camera,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Lock,
  CircleAlert,
  // Dashboard + Profile icons
  GraduationCap,
  Calendar,
  CalendarDays,
  BookOpen,
  Clock,
  MapPin,
  Phone,
  Mail,
  FileText,
  Award,
  ChevronRight,
  LogOut,
  Printer,
  Download,
  CheckCircle2,
  XCircle,
  Building2,
  Contact,
  ClipboardList,
  ArrowLeft,
  X,
  IdCard,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
//   PALETTE
// ============================================================
const PALETTE = {
  white: '#FFFFFF',
  mist: '#D2D2D3',
  sky: '#64BFE9',
  azure: '#4EA4D7',
  ocean: '#287CBB',
  navy: '#153357',
}

// ============================================================
//   TYPES
// ============================================================
type View = 'login' | 'dashboard' | 'profile'
type AuthMode = 'credentials' | 'face'
type FaceState = 'idle' | 'starting' | 'scanning' | 'verifying' | 'success' | 'error'

interface Subject {
  code: string
  title: string
  units: number
  professor: string
  professorEmail: string
  schedule: string
  room: string
  midterm: string
  finals: string
  finalGrade: string
  remarks: string
}

interface ScheduleEntry {
  day: string
  start: string
  end: string
  subject: string
  title: string
  room: string
  professor: string
  color: string
}

interface StudentDocument {
  name: string
  submitted: boolean
  dateSubmitted: string | null
}

interface Student {
  fullName: string
  firstName: string
  lastName: string
  middleName: string
  studentNumber: string
  program: string
  programShort: string
  yearLevel: string
  section: string
  semester: string
  academicYear: string
  enrollmentStatus: string
  deanLister: boolean
  deanListerSemester: string
  gpa: string
  email: string
  phone: string
  address: string
  emergencyContactName: string
  emergencyContactNumber: string
  branch: string
  branchAddress: string
  subjects: Subject[]
  schedule: ScheduleEntry[]
  documents: StudentDocument[]
}

// ============================================================
//   MOCK DATA — Test Student
// ============================================================
const TEST_CREDENTIALS = {
  username: 'student',
  password: 'student123',
}

const TEST_STUDENT: Student = {
  fullName: 'Juan Dela Cruz Santos',
  firstName: 'Juan',
  lastName: 'Santos',
  middleName: 'Dela Cruz',
  studentNumber: '2024-00123',
  program: 'Bachelor of Science in Information Technology',
  programShort: 'BSIT',
  yearLevel: '3rd Year',
  section: 'IT-3A',
  semester: '1st Semester',
  academicYear: '2025-2026',
  enrollmentStatus: 'Enrolled',
  deanLister: true,
  deanListerSemester: '1st Semester, AY 2025-2026',
  gpa: '1.37',
  email: 'juan.santos@aics.edu.ph',
  phone: '+63 917 123 4567',
  address: '123 Mabini Street, Brgy. Masambong, Quezon City, Metro Manila 1115',
  emergencyContactName: 'Maria Santos (Mother)',
  emergencyContactNumber: '+63 917 987 6543',
  branch: 'AICS Quezon City',
  branchAddress: 'Quezon Avenue, Quezon City, Metro Manila',
  subjects: [
    {
      code: 'IT 301',
      title: 'Web Systems and Technologies',
      units: 3,
      professor: 'Engr. Maria Cristina Reyes',
      professorEmail: 'm.reyes@aics.edu.ph',
      schedule: 'Mon / Wed 8:00 - 9:30 AM',
      room: 'Computer Lab 201',
      midterm: '1.25',
      finals: '1.25',
      finalGrade: '1.25',
      remarks: 'Passed',
    },
    {
      code: 'IT 302',
      title: 'Database Management Systems',
      units: 3,
      professor: 'Engr. Carlos Santos',
      professorEmail: 'c.santos@aics.edu.ph',
      schedule: 'Tue / Thu 10:00 - 11:30 AM',
      room: 'Room 105',
      midterm: '1.50',
      finals: '1.50',
      finalGrade: '1.50',
      remarks: 'Passed',
    },
    {
      code: 'IT 303',
      title: 'Object-Oriented Programming',
      units: 3,
      professor: 'Prof. Anna Lim',
      professorEmail: 'a.lim@aics.edu.ph',
      schedule: 'Mon / Wed 10:00 - 11:30 AM',
      room: 'Computer Lab 202',
      midterm: '1.00',
      finals: '1.25',
      finalGrade: '1.00',
      remarks: 'Passed',
    },
    {
      code: 'IT 304',
      title: 'Network Fundamentals',
      units: 3,
      professor: 'Engr. Roberto Cruz',
      professorEmail: 'r.cruz@aics.edu.ph',
      schedule: 'Tue / Thu 1:00 - 2:30 PM',
      room: 'Network Lab 1',
      midterm: '1.75',
      finals: '1.50',
      finalGrade: '1.50',
      remarks: 'Passed',
    },
    {
      code: 'IT 305',
      title: 'System Analysis and Design',
      units: 3,
      professor: 'Prof. Patricia Villanueva',
      professorEmail: 'p.villanueva@aics.edu.ph',
      schedule: 'Fri 8:00 - 11:00 AM',
      room: 'Room 203',
      midterm: '1.25',
      finals: '1.50',
      finalGrade: '1.25',
      remarks: 'Passed',
    },
    {
      code: 'PE 3',
      title: 'Physical Fitness and Rhythmic Activities',
      units: 2,
      professor: 'Coach Felix Guerrero',
      professorEmail: 'f.guerrero@aics.edu.ph',
      schedule: 'Sat 8:00 - 10:00 AM',
      room: 'Gymnasium',
      midterm: '1.00',
      finals: '1.00',
      finalGrade: '1.00',
      remarks: 'Passed',
    },
  ],
  schedule: [
    { day: 'Mon', start: '08:00', end: '09:30', subject: 'IT 301', title: 'Web Systems', room: 'Lab 201', professor: 'Engr. Reyes', color: '#287CBB' },
    { day: 'Mon', start: '10:00', end: '11:30', subject: 'IT 303', title: 'OOP', room: 'Lab 202', professor: 'Prof. Lim', color: '#4EA4D7' },
    { day: 'Tue', start: '10:00', end: '11:30', subject: 'IT 302', title: 'Database', room: 'Room 105', professor: 'Engr. Santos', color: '#64BFE9' },
    { day: 'Tue', start: '13:00', end: '14:30', subject: 'IT 304', title: 'Networks', room: 'Net Lab 1', professor: 'Engr. Cruz', color: '#153357' },
    { day: 'Wed', start: '08:00', end: '09:30', subject: 'IT 301', title: 'Web Systems', room: 'Lab 201', professor: 'Engr. Reyes', color: '#287CBB' },
    { day: 'Wed', start: '10:00', end: '11:30', subject: 'IT 303', title: 'OOP', room: 'Lab 202', professor: 'Prof. Lim', color: '#4EA4D7' },
    { day: 'Thu', start: '10:00', end: '11:30', subject: 'IT 302', title: 'Database', room: 'Room 105', professor: 'Engr. Santos', color: '#64BFE9' },
    { day: 'Thu', start: '13:00', end: '14:30', subject: 'IT 304', title: 'Networks', room: 'Net Lab 1', professor: 'Engr. Cruz', color: '#153357' },
    { day: 'Fri', start: '08:00', end: '11:00', subject: 'IT 305', title: 'SA&D', room: 'Room 203', professor: 'Prof. Villanueva', color: '#287CBB' },
    { day: 'Sat', start: '08:00', end: '10:00', subject: 'PE 3', title: 'PE', room: 'Gym', professor: 'Coach Guerrero', color: '#4EA4D7' },
  ],
  documents: [
    { name: 'Form 138 (Senior High School Report Card)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
    { name: 'PSA Birth Certificate', submitted: true, dateSubmitted: 'Jun 15, 2024' },
    { name: '2x2 ID Picture (2 copies)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
    { name: 'Certificate of Good Moral Character', submitted: true, dateSubmitted: 'Jun 16, 2024' },
    { name: 'Medical Certificate', submitted: false, dateSubmitted: null },
    { name: 'Honorable Dismissal (for transferees)', submitted: true, dateSubmitted: 'Jun 15, 2024' },
  ],
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
}

// ============================================================
//   HELPERS
// ============================================================
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

type IconType = React.ComponentType<{ className?: string; style?: React.CSSProperties }>

// ============================================================
//   LOGIN VIEW
// ============================================================
function LoginView({ onLogin }: { onLogin: () => void }) {
  const [authMode, setAuthMode] = useState<AuthMode>('credentials')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [faceState, setFaceState] = useState<FaceState>('idle')
  const [faceProgress, setFaceProgress] = useState(0)
  const [streamError, setStreamError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  const startFaceScan = useCallback(async () => {
    setStreamError(null)
    setFaceProgress(0)
    setFaceState('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setFaceState('scanning')
      let p = 0
      scanTimerRef.current = setInterval(() => {
        p += Math.random() * 7 + 3
        if (p >= 100) {
          p = 100
          if (scanTimerRef.current) clearInterval(scanTimerRef.current)
          setFaceProgress(100)
          setFaceState('verifying')
          setTimeout(() => {
            setFaceState('success')
            toast.success('Face verified. Welcome back to AICS Portal.')
            setTimeout(() => onLogin(), 1200)
          }, 1100)
        } else {
          setFaceProgress(p)
        }
      }, 220)
    } catch (err) {
      const e = err as DOMException
      setStreamError(
        e?.name === 'NotAllowedError'
          ? 'Camera access was denied. Please enable camera permissions in your browser.'
          : 'Unable to access camera. Please check your device and try again.'
      )
      setFaceState('error')
      stopStream()
    }
  }, [stopStream, onLogin])

  const cancelFaceScan = useCallback(() => {
    stopStream()
    setFaceState('idle')
    setFaceProgress(0)
    setStreamError(null)
  }, [stopStream])

  const retryFaceScan = useCallback(() => {
    cancelFaceScan()
    setTimeout(() => startFaceScan(), 50)
  }, [cancelFaceScan, startFaceScan])

  const handleCredentialSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!username.trim() || !password.trim()) {
        toast.error('Please enter both your username and password.')
        return
      }
      setSubmitting(true)
      setTimeout(() => {
        setSubmitting(false)
        toast.success('Signed in. Redirecting to your AICS dashboard...')
        onLogin()
      }, 1200)
    },
    [username, password, onLogin]
  )

  const handleTestLogin = useCallback(() => {
    setUsername(TEST_CREDENTIALS.username)
    setPassword(TEST_CREDENTIALS.password)
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      toast.success('Test login successful. Welcome, Juan!')
      onLogin()
    }, 800)
  }, [onLogin])

  return (
    <main
      className="min-h-screen w-full flex flex-col lg:flex-row font-sans"
      style={{ background: PALETTE.white, color: PALETTE.navy }}
    >
      {/* ============ LEFT 60% ============ */}
      <section
        className="relative lg:w-[60%] w-full h-[40vh] lg:h-screen overflow-hidden flex-shrink-0"
        style={{ background: PALETTE.navy }}
      >
        <img
          src="/aics-campus.jpg"
          alt="Asian Institute of Computer Studies campus"
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.display = 'none'
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${PALETTE.navy}E6 0%, ${PALETTE.ocean}B3 45%, ${PALETTE.azure}66 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top brand row */}
        <div className="absolute top-0 left-0 right-0 px-6 sm:px-10 lg:px-14 py-7 flex items-center gap-3 text-white">
          <img
            src="/aics-logo.svg"
            alt="AICS logo"
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 object-contain"
          />
          <div className="leading-tight">
            <p className="text-[11px] tracking-[0.28em] uppercase text-white/70">Portal</p>
            <p className="text-base sm:text-lg font-semibold">Asian Institute of Computer Studies</p>
          </div>
        </div>

        {/* Hero text bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-10 lg:px-14 pb-10 lg:pb-14 text-white">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-xl">
              Welcome to your <span style={{ color: PALETTE.sky }}>AICS Portal</span>.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/80 max-w-md leading-relaxed">
              Secure access to your enrollment records, class schedules, grades, and academic
              resources — all in one place.
            </p>
          </motion.div>
          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/55">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protected by AICS Information Technology Services</span>
          </div>
        </div>
      </section>

      {/* ============ RIGHT 40% ============ */}
      <section
        className="relative z-10 lg:w-[calc(40%+3rem)] w-full flex-1 lg:h-screen flex items-center justify-center px-6 sm:px-10 py-12 lg:py-0 lg:-ml-12 rounded-l-[40px]"
        style={{ background: PALETTE.white }}
      >
        <div className="relative w-full max-w-sm">
          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: PALETTE.navy }}>
              {authMode === 'credentials' ? 'Account Login' : 'Face Recognition'}
            </h2>
            <p className="text-sm mt-1.5" style={{ color: '#6b7280' }}>
              {authMode === 'credentials'
                ? 'Enter your AICS credentials below to access your portal.'
                : 'Position your face within the frame for biometric verification.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6"
            style={{ background: PALETTE.mist + '55' }}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('credentials')
                if (faceState !== 'idle') cancelFaceScan()
              }}
              className="text-xs font-semibold py-2.5 rounded-lg transition-all"
              style={
                authMode === 'credentials'
                  ? { background: PALETTE.white, color: PALETTE.navy, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { color: PALETTE.ocean }
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Credentials
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('face')}
              className="text-xs font-semibold py-2.5 rounded-lg transition-all"
              style={
                authMode === 'face'
                  ? { background: PALETTE.white, color: PALETTE.navy, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                  : { color: PALETTE.ocean }
              }
            >
              <span className="inline-flex items-center gap-1.5">
                <ScanFace className="w-3.5 h-3.5" /> Face ID
              </span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {authMode === 'credentials' ? (
              <motion.form
                key="cred"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleCredentialSubmit}
                className="space-y-4"
              >
                {/* Username */}
                <div className="space-y-1.5">
                  <label htmlFor="username" className="text-xs font-medium" style={{ color: PALETTE.navy }}>
                    Username
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: PALETTE.azure }} />
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. juan.delacruz"
                      className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm bg-white border outline-none transition-all"
                      style={{ borderColor: PALETTE.mist, color: PALETTE.navy }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.azure
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${PALETTE.sky}33`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.mist
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-medium" style={{ color: PALETTE.navy }}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: PALETTE.azure }} />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm bg-white border outline-none transition-all"
                      style={{ borderColor: PALETTE.mist, color: PALETTE.navy }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.azure
                        e.currentTarget.style.boxShadow = `0 0 0 3px ${PALETTE.sky}33`
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = PALETTE.mist
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100 transition-colors"
                      style={{ color: PALETTE.ocean }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember + forgot */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={remember}
                      onClick={() => setRemember((r) => !r)}
                      className="relative w-9 h-5 rounded-full transition-colors"
                      style={{ background: remember ? PALETTE.azure : PALETTE.mist }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm"
                        style={{ transform: remember ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </button>
                    <span style={{ color: PALETTE.navy }}>Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => toast.info('Contact the AICS IT Office to reset your password.')}
                    className="font-medium hover:underline"
                    style={{ color: PALETTE.ocean }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-2 py-3 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-lg active:scale-[0.99]"
                  style={{
                    background: `linear-gradient(135deg, ${PALETTE.ocean} 0%, ${PALETTE.azure} 100%)`,
                    boxShadow: `0 6px 16px -6px ${PALETTE.ocean}88`,
                  }}
                >
                  {submitting ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                    </span>
                  ) : (
                    'Sign In'
                  )}
                </button>

                {/* Test login divider */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px" style={{ background: PALETTE.mist }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>
                    or
                  </span>
                  <div className="flex-1 h-px" style={{ background: PALETTE.mist }} />
                </div>

                {/* Test Student Login */}
                <button
                  type="button"
                  onClick={handleTestLogin}
                  disabled={submitting}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm transition-all hover:shadow-md active:scale-[0.99] flex items-center justify-center gap-2"
                  style={{
                    background: PALETTE.white,
                    border: `1.5px dashed ${PALETTE.azure}`,
                    color: PALETTE.ocean,
                  }}
                >
                  <UserRound className="w-4 h-4" />
                  Test Student Login
                </button>
                <p className="text-center text-[10px]" style={{ color: '#9ca3af' }}>
                  Demo account: <span className="font-mono font-semibold" style={{ color: PALETTE.ocean }}>{TEST_CREDENTIALS.username}</span>
                  {' '}/{' '}
                  <span className="font-mono font-semibold" style={{ color: PALETTE.ocean }}>{TEST_CREDENTIALS.password}</span>
                </p>
              </motion.form>
            ) : (
              <motion.div
                key="face"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {/* Face video area */}
                <div
                  className="relative aspect-square w-full rounded-2xl overflow-hidden flex items-center justify-center"
                  style={{ background: PALETTE.navy, boxShadow: `inset 0 0 0 1px ${PALETTE.mist}` }}
                >
                  {(faceState === 'starting' || faceState === 'scanning' || faceState === 'verifying' || faceState === 'success') && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)' }}
                    />
                  )}

                  {faceState === 'idle' && (
                    <div className="text-center px-6">
                      <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <ScanFace className="w-10 h-10" style={{ color: PALETTE.sky }} />
                      </div>
                      <p className="text-white text-sm font-medium">Face Recognition</p>
                      <p className="text-white/55 text-xs mt-1 max-w-[220px] mx-auto">
                        Click start and look directly at the camera. Your face is your password.
                      </p>
                    </div>
                  )}

                  {(faceState === 'scanning' || faceState === 'verifying') && (
                    <>
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="relative w-[58%] aspect-[3/4] rounded-[42%]"
                          style={{
                            border: `2px solid ${PALETTE.sky}`,
                            boxShadow: `0 0 0 4px ${PALETTE.sky}22, inset 0 0 30px ${PALETTE.sky}33`,
                          }}
                        >
                          {['-top-1 -left-1 border-t-2 border-l-2', '-top-1 -right-1 border-t-2 border-r-2', '-bottom-1 -left-1 border-b-2 border-l-2', '-bottom-1 -right-1 border-b-2 border-r-2'].map((pos) => (
                            <span key={pos} className={`absolute ${pos} w-4 h-4 rounded-sm`} style={{ borderColor: PALETTE.sky }} />
                          ))}
                        </div>
                      </div>
                      <motion.div
                        className="absolute left-0 right-0 h-[2px]"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${PALETTE.sky}, transparent)`,
                          boxShadow: `0 0 12px ${PALETTE.sky}`,
                        }}
                        initial={{ top: '10%' }}
                        animate={{ top: ['10%', '88%', '10%'] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <div className="absolute bottom-3 left-3 right-3">
                        <div className="flex items-center justify-between text-[10px] text-white/80 mb-1.5">
                          <span className="inline-flex items-center gap-1">
                            <Camera className="w-3 h-3" />
                            {faceState === 'verifying' ? 'Verifying identity...' : 'Scanning face...'}
                          </span>
                          <span>{Math.round(faceProgress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${faceProgress}%`, background: `linear-gradient(90deg, ${PALETTE.sky}, ${PALETTE.azure})` }}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {faceState === 'success' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
                      style={{ background: `${PALETTE.navy}E6` }}
                    >
                      <motion.div
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                        className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                        style={{ background: PALETTE.sky }}
                      >
                        <ShieldCheck className="w-10 h-10 text-white" />
                      </motion.div>
                      <p className="text-white font-semibold text-base">Identity Verified</p>
                      <p className="text-white/60 text-xs mt-1">Redirecting to portal...</p>
                    </motion.div>
                  )}

                  {faceState === 'error' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: PALETTE.navy }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(220,38,38,0.18)' }}>
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                      </div>
                      <p className="text-white text-sm font-medium">Camera Unavailable</p>
                      <p className="text-white/55 text-xs mt-1 max-w-[220px]">
                        {streamError || 'Please check your camera and try again.'}
                      </p>
                    </div>
                  )}
                </div>

                {faceState === 'idle' && (
                  <button
                    type="button"
                    onClick={startFaceScan}
                    className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg active:scale-[0.99]"
                    style={{
                      background: `linear-gradient(135deg, ${PALETTE.ocean} 0%, ${PALETTE.azure} 100%)`,
                      boxShadow: `0 6px 16px -6px ${PALETTE.ocean}88`,
                    }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Camera className="w-4 h-4" /> Start Face Recognition
                    </span>
                  </button>
                )}

                {(faceState === 'scanning' || faceState === 'verifying' || faceState === 'starting') && (
                  <button
                    type="button"
                    onClick={cancelFaceScan}
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:bg-gray-50 active:scale-[0.99]"
                    style={{ background: PALETTE.white, border: `1px solid ${PALETTE.mist}`, color: PALETTE.navy }}
                  >
                    Cancel
                  </button>
                )}

                {faceState === 'error' && (
                  <button
                    type="button"
                    onClick={retryFaceScan}
                    className="w-full py-3 rounded-lg font-semibold text-sm text-white transition-all hover:shadow-lg active:scale-[0.99]"
                    style={{ background: `linear-gradient(135deg, ${PALETTE.ocean} 0%, ${PALETTE.azure} 100%)` }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Try Again
                    </span>
                  </button>
                )}

                {faceState === 'success' && (
                  <button
                    type="button"
                    onClick={cancelFaceScan}
                    className="w-full py-3 rounded-lg font-semibold text-sm transition-all hover:bg-gray-50"
                    style={{ background: PALETTE.white, border: `1px solid ${PALETTE.mist}`, color: PALETTE.navy }}
                  >
                    Reset
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* IT support note */}
          <div
            className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl text-xs leading-relaxed"
            style={{ background: `${PALETTE.sky}1A`, border: `1px solid ${PALETTE.sky}55`, color: PALETTE.navy }}
          >
            <CircleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: PALETTE.ocean }} />
            <p>
              <span className="font-semibold">Having trouble signing in?</span> Please contact the
              AICS IT Office at{' '}
              <a href="mailto:it-support@aics.edu.ph" className="font-medium underline decoration-dotted" style={{ color: PALETTE.ocean }}>
                it-support@aics.edu.ph
              </a>{' '}
              or call <span className="font-medium">(02) 8XXX-XXXX</span> for assistance.
            </p>
          </div>

          <p className="mt-6 text-center text-[11px]" style={{ color: '#9ca3af' }}>
            &copy; {new Date().getFullYear()} Asian Institute of Computer Studies. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  )
}

// ============================================================
//   PORTAL NAVBAR (shared)
// ============================================================
function PortalNavbar({
  student,
  onProfile,
  onLogout,
}: {
  student: Student
  onProfile: () => void
  onLogout: () => void
}) {
  return (
    <header
      className="sticky top-0 z-40 w-full no-print"
      style={{ background: PALETTE.white, borderBottom: `1px solid ${PALETTE.mist}55` }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/aics-logo.svg" alt="AICS" className="w-9 h-9" />
          <div className="leading-tight">
            <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: PALETTE.azure }}>
              Student Portal
            </p>
            <p className="text-sm font-semibold" style={{ color: PALETTE.navy }}>
              Asian Institute of Computer Studies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onProfile}
            className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
            style={{ border: `1px solid ${PALETTE.mist}` }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{ background: `linear-gradient(135deg, ${PALETTE.ocean}, ${PALETTE.azure})` }}
            >
              {getInitials(student.fullName)}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs font-semibold" style={{ color: PALETTE.navy }}>
                {student.firstName}
              </p>
              <p className="text-[10px]" style={{ color: '#6b7280' }}>
                {student.studentNumber}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 hidden sm:block" style={{ color: PALETTE.azure }} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg transition-colors hover:bg-gray-50"
            style={{ color: PALETTE.ocean }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

// ============================================================
//   WEEKLY SCHEDULE GRID
// ============================================================
function WeeklyScheduleGrid({ schedule }: { schedule: ScheduleEntry[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {DAYS.map((day) => {
        const dayClasses = schedule
          .filter((s) => s.day === day)
          .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
        return (
          <div key={day} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${PALETTE.mist}55` }}>
            <div className="px-3 py-2 text-center" style={{ background: PALETTE.navy }}>
              <p className="text-xs font-bold text-white tracking-wider uppercase">{day}</p>
              <p className="text-[9px] text-white/50">{DAY_LABELS[day]}</p>
            </div>
            <div className="p-2 space-y-2 min-h-[140px]" style={{ background: '#f9fafb' }}>
              {dayClasses.length === 0 ? (
                <p className="text-[10px] text-center py-6" style={{ color: '#9ca3af' }}>
                  No classes
                </p>
              ) : (
                dayClasses.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg p-2.5 text-white text-xs"
                    style={{ background: c.color, borderLeft: '3px solid rgba(255,255,255,0.5)' }}
                  >
                    <p className="font-bold">{c.subject}</p>
                    <p className="text-[10px] opacity-90 mt-0.5">{c.title}</p>
                    <div className="flex items-center gap-1 mt-1.5 opacity-85">
                      <Clock className="w-2.5 h-2.5" />
                      <p className="text-[9px]">
                        {formatTime(c.start)} - {formatTime(c.end)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 opacity-85">
                      <MapPin className="w-2.5 h-2.5" />
                      <p className="text-[9px]">{c.room}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================
//   STUDENT DASHBOARD
// ============================================================
function StudentDashboard({
  student,
  onProfile,
  onLogout,
}: {
  student: Student
  onProfile: () => void
  onLogout: () => void
}) {
  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <PortalNavbar student={student} onProfile={onProfile} onLogout={onLogout} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome banner */}
        <div
          className="rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.ocean} 100%)` }}
        >
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10"
            style={{ background: PALETTE.sky, transform: 'translate(30%, -40%)' }}
          />
          <div
            className="absolute bottom-0 right-12 w-32 h-32 rounded-full opacity-10"
            style={{ background: PALETTE.azure, transform: 'translate(50%, 40%)' }}
          />

          <div className="relative">
            <p className="text-xs tracking-[0.2em] uppercase text-white/60 mb-2">
              {student.semester} &bull; AY {student.academicYear}
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {student.firstName}!</h1>
            <p className="text-sm text-white/70 mt-2">
              {student.program} &bull; {student.yearLevel}, {student.section}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-white/60">GPA</p>
                <p className="text-xl font-bold">{student.gpa}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-white/60">Units Enrolled</p>
                <p className="text-xl font-bold">{totalUnits}</p>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-wider text-white/60">Subjects</p>
                <p className="text-xl font-bold">{student.subjects.length}</p>
              </div>
              {student.deanLister && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: `${PALETTE.sky}33` }}>
                  <Award className="w-5 h-5" style={{ color: PALETTE.sky }} />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-white/60">Status</p>
                    <p className="text-sm font-bold">Dean&apos;s Lister</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grades & Subjects Table */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: `1px solid ${PALETTE.mist}55` }}>
          <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: `${PALETTE.mist}55` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${PALETTE.sky}26` }}>
              <GraduationCap className="w-5 h-5" style={{ color: PALETTE.ocean }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                Grades &amp; Subjects
              </h2>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Your enrolled subjects, units, professors, and current grades
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: `${PALETTE.mist}33` }}>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Code
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Subject
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Units
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Professor
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Midterm
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Finals
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Final Grade
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wider" style={{ color: PALETTE.navy }}>
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {student.subjects.map((s, i) => (
                  <tr
                    key={s.code}
                    className="transition-colors hover:bg-gray-50"
                    style={{ borderBottom: i < student.subjects.length - 1 ? `1px solid ${PALETTE.mist}33` : 'none' }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono font-semibold text-xs" style={{ color: PALETTE.ocean }}>
                        {s.code}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm" style={{ color: PALETTE.navy }}>
                        {s.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>
                        {s.schedule} &bull; {s.room}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center" style={{ color: PALETTE.navy }}>
                      {s.units}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: PALETTE.navy }}>
                        {s.professor}
                      </p>
                      <p className="text-xs" style={{ color: '#6b7280' }}>
                        {s.professorEmail}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm" style={{ color: PALETTE.navy }}>
                      {s.midterm}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm" style={{ color: PALETTE.navy }}>
                      {s.finals}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block px-2.5 py-1 rounded-md font-mono font-bold text-sm text-white"
                        style={{ background: PALETTE.ocean }}
                      >
                        {s.finalGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md"
                        style={{ background: `${PALETTE.sky}26`, color: PALETTE.ocean }}
                      >
                        <CheckCircle2 className="w-3 h-3" /> {s.remarks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: `${PALETTE.mist}33` }}>
                  <td className="px-4 py-3 font-semibold text-sm" colSpan={2} style={{ color: PALETTE.navy }}>
                    Total Units Enrolled
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-sm" style={{ color: PALETTE.navy }}>
                    {totalUnits}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Weekly Schedule */}
        <section className="bg-white rounded-2xl shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
          <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: `${PALETTE.mist}55` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${PALETTE.sky}26` }}>
              <CalendarDays className="w-5 h-5" style={{ color: PALETTE.ocean }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: PALETTE.navy }}>
                Weekly Schedule
              </h2>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Your class schedule from Monday to Saturday
              </p>
            </div>
          </div>
          <div className="p-6">
            <WeeklyScheduleGrid schedule={student.schedule} />
          </div>
        </section>
      </main>
    </div>
  )
}

// ============================================================
//   INFO ROW (for profile)
// ============================================================
function InfoRow({ icon: Icon, label, value }: { icon: IconType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${PALETTE.sky}1A` }}>
        <Icon className="w-4 h-4" style={{ color: PALETTE.ocean }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: '#6b7280' }}>
          {label}
        </p>
        <p className="text-sm font-medium mt-0.5 break-words" style={{ color: PALETTE.navy }}>
          {value}
        </p>
      </div>
    </div>
  )
}

// ============================================================
//   DIGITAL ID CARD
// ============================================================
function DigitalIDCard({ student }: { student: Student }) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-lg"
      style={{ background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.ocean} 100%)` }}
    >
      {/* Top: school header */}
      <div className="p-3 flex items-center gap-2 border-b border-white/10">
        <img src="/aics-logo.svg" alt="AICS" className="w-8 h-8" />
        <div className="leading-tight">
          <p className="text-[7px] uppercase tracking-wider text-white/60">Asian Institute of</p>
          <p className="text-[11px] font-bold text-white">Computer Studies</p>
        </div>
        <div className="ml-auto">
          <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: PALETTE.sky, color: PALETTE.navy }}>
            Student ID
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex gap-3">
        <div
          className="w-16 h-20 rounded-lg flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          {getInitials(student.fullName)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[8px] uppercase tracking-wider text-white/50">Name</p>
          <p className="text-sm font-bold text-white truncate">{student.fullName}</p>
          <p className="text-[8px] uppercase tracking-wider text-white/50 mt-1.5">Student No.</p>
          <p className="text-[11px] text-white/90">{student.studentNumber}</p>
          <p className="text-[8px] uppercase tracking-wider text-white/50 mt-1.5">Program</p>
          <p className="text-[10px] text-white/80">
            {student.programShort} &bull; {student.yearLevel}
          </p>
        </div>
      </div>

      {/* Branch + validity */}
      <div className="px-3 pb-2 flex items-center justify-between">
        <div>
          <p className="text-[7px] uppercase tracking-wider text-white/50">Branch</p>
          <p className="text-[10px] text-white/80">{student.branch}</p>
        </div>
        <div className="text-right">
          <p className="text-[7px] uppercase tracking-wider text-white/50">Valid</p>
          <p className="text-[10px] text-white/80">AY {student.academicYear}</p>
        </div>
      </div>

      {/* Barcode-style strip */}
      <div className="px-3 pb-3">
        <div className="flex gap-px h-7 items-end bg-white/5 rounded p-1">
          {Array.from({ length: 48 }).map((_, i) => (
            <div
              key={i}
              className="bg-white/80"
              style={{ width: '2px', height: `${30 + ((i * 37) % 70)}%` }}
            />
          ))}
        </div>
        <p className="text-[7px] text-white/40 mt-1 text-center font-mono">{student.studentNumber}</p>
      </div>
    </div>
  )
}

// ============================================================
//   COE DOCUMENT (printable)
// ============================================================
function COEDocument({ student }: { student: Student }) {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: PALETTE.navy }}>
      {/* Letterhead */}
      <div className="flex items-center gap-4 pb-4" style={{ borderBottom: `2px solid ${PALETTE.navy}` }}>
        <img src="/aics-logo.svg" alt="AICS" className="w-16 h-16" />
        <div className="flex-1 text-center">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#6b7280' }}>
            Republic of the Philippines
          </p>
          <h1 className="text-xl font-bold" style={{ color: PALETTE.navy }}>
            ASIAN INSTITUTE OF COMPUTER STUDIES
          </h1>
          <p className="text-xs" style={{ color: '#6b7280' }}>
            {student.branchAddress}
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="text-center my-8">
        <h2 className="text-lg font-bold tracking-widest uppercase" style={{ color: PALETTE.navy }}>
          Certificate of Enrollment
        </h2>
        <div className="w-32 h-0.5 mx-auto mt-2" style={{ background: PALETTE.ocean }} />
      </div>

      {/* Body */}
      <div className="text-sm leading-relaxed" style={{ color: PALETTE.navy }}>
        <p className="mb-4 pl-8">
          <strong>TO WHOM IT MAY CONCERN:</strong>
        </p>
        <p className="mb-4 pl-8 text-justify">
          This is to certify that <strong>{student.fullName}</strong>, Student Number{' '}
          <strong>{student.studentNumber}</strong>, is officially enrolled at the {student.branch} for
          the {student.semester} of Academic Year {student.academicYear}, in the program{' '}
          <strong>{student.program}</strong>, currently in <strong>{student.yearLevel}</strong> level,
          Section <strong>{student.section}</strong>.
        </p>
        <p className="mb-4 pl-8 text-justify">
          The student is carrying a total load of <strong>{totalUnits} units</strong> consisting of{' '}
          {student.subjects.length} subjects for the said semester, as listed below:
        </p>
      </div>

      {/* Subjects table */}
      <div className="mb-8">
        <table className="w-full text-xs border-collapse" style={{ color: PALETTE.navy }}>
          <thead>
            <tr style={{ background: `${PALETTE.mist}55` }}>
              <th className="border px-2 py-1.5 text-left font-semibold" style={{ borderColor: PALETTE.navy }}>
                Code
              </th>
              <th className="border px-2 py-1.5 text-left font-semibold" style={{ borderColor: PALETTE.navy }}>
                Subject Title
              </th>
              <th className="border px-2 py-1.5 text-center font-semibold" style={{ borderColor: PALETTE.navy }}>
                Units
              </th>
              <th className="border px-2 py-1.5 text-left font-semibold" style={{ borderColor: PALETTE.navy }}>
                Schedule
              </th>
              <th className="border px-2 py-1.5 text-left font-semibold" style={{ borderColor: PALETTE.navy }}>
                Room
              </th>
            </tr>
          </thead>
          <tbody>
            {student.subjects.map((s) => (
              <tr key={s.code}>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.code}
                </td>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.title}
                </td>
                <td className="border px-2 py-1.5 text-center" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.units}
                </td>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.schedule}
                </td>
                <td className="border px-2 py-1.5" style={{ borderColor: `${PALETTE.mist}88` }}>
                  {s.room}
                </td>
              </tr>
            ))}
            <tr style={{ background: `${PALETTE.mist}33` }}>
              <td className="border px-2 py-1.5 font-bold" colSpan={2} style={{ borderColor: PALETTE.navy }}>
                Total
              </td>
              <td className="border px-2 py-1.5 text-center font-bold" style={{ borderColor: PALETTE.navy }}>
                {totalUnits}
              </td>
              <td className="border px-2 py-1.5" colSpan={2} style={{ borderColor: PALETTE.navy }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mb-8 pl-8 text-sm text-justify" style={{ color: PALETTE.navy }}>
        This certification is being issued upon the request of the above-named student for whatever
        legal purpose it may serve.
      </p>

      {/* Signature */}
      <div className="flex justify-end mt-12">
        <div className="text-center">
          <p className="text-xs mb-1" style={{ color: '#6b7280' }}>
            Issued on: {today}
          </p>
          <div className="w-56 border-t" style={{ borderColor: PALETTE.navy, marginTop: '2.5rem' }} />
          <p className="text-xs font-semibold mt-1" style={{ color: PALETTE.navy }}>
            Office of the Registrar
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
//   COE MODAL
// ============================================================
function COEModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 no-print"
      style={{ background: 'rgba(21,51,87,0.55)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b no-print"
          style={{ borderColor: PALETTE.mist }}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" style={{ color: PALETTE.ocean }} />
            <h3 className="font-bold text-sm" style={{ color: PALETTE.navy }}>
              Certificate of Enrollment
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-md"
              style={{ background: PALETTE.ocean }}
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-gray-50"
              style={{ border: `1px solid ${PALETTE.mist}`, color: PALETTE.navy }}
            >
              <Download className="w-3.5 h-3.5" /> Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: '#6b7280' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* COE document */}
        <div className="overflow-y-auto p-8 coe-print-area">
          <COEDocument student={student} />
        </div>
      </motion.div>
    </motion.div>
  )
}

// ============================================================
//   STUDENT PROFILE
// ============================================================
function StudentProfile({
  student,
  onBack,
  onLogout,
}: {
  student: Student
  onBack: () => void
  onLogout: () => void
}) {
  const [showCOE, setShowCOE] = useState(false)
  const totalUnits = student.subjects.reduce((sum, s) => sum + s.units, 0)
  const submittedDocs = student.documents.filter((d) => d.submitted).length

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      <PortalNavbar student={student} onProfile={onBack} onLogout={onLogout} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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
          <div className="h-24" style={{ background: `linear-gradient(135deg, ${PALETTE.navy} 0%, ${PALETTE.ocean} 100%)` }} />
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
          <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
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
          <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
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
          <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
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
          <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4" style={{ color: PALETTE.azure }} />
              <p className="text-[10px] uppercase tracking-wider" style={{ color: '#6b7280' }}>
                Standing
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: student.deanLister ? PALETTE.ocean : PALETTE.navy }}>
              {student.deanLister ? 'Dean\'s Lister' : 'Regular'}
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
              <InfoRow icon={BookOpen} label="Year & Section" value={`${student.yearLevel}, ${student.section}`} />
              <InfoRow icon={Building2} label="Branch" value={student.branch} />
              <InfoRow icon={MapPin} label="Address" value={student.address} />
              <InfoRow icon={Phone} label="Contact Number" value={student.phone} />
              <InfoRow icon={Mail} label="Email" value={student.email} />
              <InfoRow icon={Contact} label="Emergency Contact" value={`${student.emergencyContactName} — ${student.emergencyContactNumber}`} />
              <InfoRow icon={CalendarDays} label="Semester" value={`${student.semester}, AY ${student.academicYear}`} />
              <InfoRow icon={Award} label="Dean's Lister" value={student.deanLister ? `Yes — ${student.deanListerSemester}` : 'No'} />
              <InfoRow icon={CheckCircle2} label="Enrollment Status" value={student.enrollmentStatus} />
            </div>
          </div>

          {/* Digital ID (1 col) */}
          <div className="bg-white rounded-2xl shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
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
        <div className="bg-white rounded-2xl shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
          <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: `${PALETTE.mist}55` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${PALETTE.sky}26` }}>
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
              <div key={i} className="px-6 py-4 flex items-center justify-between transition-colors hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {doc.submitted ? (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${PALETTE.sky}26` }}>
                      <CheckCircle2 className="w-5 h-5" style={{ color: PALETTE.ocean }} />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#fef2f2' }}>
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
        <div className="bg-white rounded-2xl shadow-sm" style={{ border: `1px solid ${PALETTE.mist}55` }}>
          <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: `${PALETTE.mist}55` }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${PALETTE.sky}26` }}>
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

      {/* COE Modal */}
      <AnimatePresence>
        {showCOE && <COEModal student={student} onClose={() => setShowCOE(false)} />}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
//   MAIN — View Router
// ============================================================
export default function AICSLoginPage() {
  const [view, setView] = useState<View>('login')

  const handleLogin = useCallback(() => {
    setView('dashboard')
  }, [])

  const handleLogout = useCallback(() => {
    setView('login')
    toast.info('You have been signed out.')
  }, [])

  if (view === 'dashboard') {
    return (
      <StudentDashboard
        student={TEST_STUDENT}
        onProfile={() => setView('profile')}
        onLogout={handleLogout}
      />
    )
  }

  if (view === 'profile') {
    return (
      <StudentProfile
        student={TEST_STUDENT}
        onBack={() => setView('dashboard')}
        onLogout={handleLogout}
      />
    )
  }

  return <LoginView onLogin={handleLogin} />
}
