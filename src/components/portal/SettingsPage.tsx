'use client'

import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  User,
  Lock,
  Bell,
  Camera,
  Mail,
  Phone,
  MapPin,
  Users as UsersIcon,
  Eye,
  EyeOff,
  Check,
  Loader2,
  Trash2,
  ShieldCheck,
  Download,
  ExternalLink,
  Cookie,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import { getInitials } from '@/lib/aics/format'
import { PortalShell } from './PortalShell'
import { CookieSettingsButton } from '@/components/legal/CookieSettingsButton'
import { LEGAL, POLICY_PAGES } from '@/lib/legal/site'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'
import type { NotificationInbox } from '@/lib/aics/notifications'

interface SettingsPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
  // Faculty teaching data, used only for the role-aware search index.
  facultyData?: { subjects: any[]; students: any[] } | null
  inbox?: NotificationInbox
  // Merges a partial student update into the loaded record (photoUrl
  // after an avatar upload) so every avatar on screen updates without
  // a refetch/remount.
  onStudentPatch?: (patch: Partial<Student>) => void
}

type Section = 'profile' | 'security' | 'notifications' | 'privacy'

// Matches PHOTO_MAX_BYTES on the server (POST /api/student/photo).
const PHOTO_MAX_BYTES = 5 * 1024 * 1024

export function SettingsPage({ student, onNavigate, onLogout, events, professors, tasks, facultyData, inbox, onStudentPatch }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('profile')

  // Profile edit state
  const [phone, setPhone] = useState(student.phone || '')
  const [email, setEmail] = useState(student.email || '')
  const [address, setAddress] = useState(student.address || '')
  const [emergencyName, setEmergencyName] = useState(student.emergencyContactName || '')
  const [emergencyNumber, setEmergencyNumber] = useState(student.emergencyContactNumber || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Photo upload state: optimistic local preview while the signed
  // direct browser→Cloudinary upload is in flight. The upload itself is
  // consent-gated — see photoConsent below.
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  // Explicit, informed consent for the third-party (Cloudinary, US)
  // transfer of the photo. Opt-in per session; unchecked by default.
  const [photoConsent, setPhotoConsent] = useState(false)

  // Data export state (Privacy & Data section).
  const [exporting, setExporting] = useState(false)

  // Never leak the optimistic object URL.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Allow picking the same file twice after a failure.
    e.target.value = ''
    if (!file) return
    if (!photoConsent) {
      toast.error('Please confirm the photo storage notice first.')
      return
    }
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) {
      toast.error('Please choose a PNG, JPG, or WebP image.')
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error('Image must be 5 MB or less.')
      return
    }

    setPhotoBusy(true)
    const localUrl = URL.createObjectURL(file)
    setPhotoPreview(localUrl)
    try {
      // 1. Square-crop + downscale in the browser: a 4000px phone
      //    photo becomes a 512px JPEG before it ever leaves the device.
      const blob = await squareResize(file, 512)

      // 2. Signed params for one direct upload into the user's own
      //    server-assigned folder (identity comes from the session).
      const signRes = await fetch('/api/student/photo', { method: 'POST' })
      const sign = await signRes.json()
      if (!sign.ok) throw new Error(sign.error || 'Photo upload is not available right now.')

      // 3. The file goes straight to Cloudinary, never through the app server.
      const form = new FormData()
      form.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
      form.append('api_key', sign.apiKey)
      form.append('timestamp', String(sign.timestamp))
      form.append('folder', sign.folder)
      form.append('signature', sign.signature)
      const upRes = await fetch(sign.uploadUrl, { method: 'POST', body: form })
      const up = await upRes.json()
      if (!up.secure_url) throw new Error(up.error?.message || 'Cloudinary rejected the upload.')

      // 4. Persist the URL on the profile record.
      const saveRes = await fetch(`/api/student/update?username=${encodeURIComponent(student.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl: up.secure_url }),
      })
      const saved = await saveRes.json()
      if (!saved.ok) throw new Error(saved.error || 'Failed to save the photo to your profile.')

      onStudentPatch?.({ photoUrl: up.secure_url as string })
      toast.success('Profile photo updated.')

      // 5. Fire-and-forget: destroy the replaced asset so it does not
      //    orphan in Cloudinary. Server validates it is the user's own.
      if (sign.oldPublicId) {
        fetch('/api/student/photo/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: sign.oldPublicId }),
        }).catch(() => {})
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setPhotoBusy(false)
      URL.revokeObjectURL(localUrl)
      setPhotoPreview(null)
    }
  }

  const handleRemovePhoto = async () => {
    setPhotoBusy(true)
    try {
      const res = await fetch(`/api/student/photo?username=${encodeURIComponent(student.username)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to remove the photo.')
      onStudentPatch?.({ photoUrl: '' })
      toast.success('Photo removed.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove the photo.')
    } finally {
      setPhotoBusy(false)
    }
  }

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Notification prefs (local only for now — would persist to DB)
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [smsNotifs, setSmsNotifs] = useState(false)
  const [eventReminders, setEventReminders] = useState(true)
  const [taskDeadlines, setTaskDeadlines] = useState(true)

  // Data portability: export everything the server holds for the signed-in
  // account (role-aware, no human in the loop).
  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/student/export')
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Export failed. Please try again.')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aics-portal-my-data-${student.username}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Your data export has been downloaded.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const res = await fetch(`/api/student/update?username=${encodeURIComponent(student.username)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, address, emergencyContactName: emergencyName, emergencyContactNumber: emergencyNumber }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Profile updated successfully.')
      } else {
        toast.error(data.error || 'Failed to update profile.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }

    setSavingPassword(true)
    try {
      const res = await fetch(`/api/auth/change-password?username=${encodeURIComponent(student.username)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Password changed successfully.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        toast.error(data.error || 'Failed to change password.')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setSavingPassword(false)
    }
  }

  const sections: { id: Section; label: string; icon: typeof User }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Data', icon: ShieldCheck },
  ]

  return (
    <PortalShell
      student={student}
      active="settings"
      onNavigate={onNavigate}
      onLogout={onLogout}
      events={events}
      professors={professors}
      tasks={tasks}
      facultyData={facultyData}
      inbox={inbox}
    >
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 max-w-4xl">
          {/* Page header */}
          <div>
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-balance text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your account, security, and notification preferences
            </p>
          </div>

          {/* Section tabs — scroll horizontally when they exceed the
              container width (phones), no visible scrollbar */}
          <div
            className="inline-flex gap-1 p-1 rounded-xl bg-slate-100 mb-6 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Settings sections"
          >
            {sections.map((s) => {
              const Icon = s.icon
              const selected = activeSection === s.id
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveSection(s.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 flex-shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    selected ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" aria-hidden /> {s.label}
                </button>
              )
            })}
          </div>

          {/* Profile section */}
          {activeSection === 'profile' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Contact information</h2>
                <p className="text-xs text-slate-500 mt-0.5">Update your contact details. Changes apply immediately.</p>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Photo — direct browser→Cloudinary upload, signed server-side.
                    The upload button stays disabled until the storage consent
                    checkbox is ticked (third-party transfer disclosure). */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0">
                    {photoPreview || student.photoUrl ? (
                      <img
                        src={photoPreview || student.photoUrl}
                        alt={student.fullName}
                        className="w-20 h-20 rounded-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-800 to-blue-600 text-white text-2xl font-bold grid place-items-center" aria-hidden="true">
                        {getInitials(student.fullName)}
                      </div>
                    )}
                    {photoBusy && (
                      <div className="absolute inset-0 rounded-full bg-slate-900/50 grid place-items-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{student.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, or WebP. Square photos work best. Shown on your profile, ID, and top bar.</p>
                    <label className="flex items-start gap-2 mt-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={photoConsent}
                        onChange={(e) => setPhotoConsent(e.target.checked)}
                        className="mt-0.5 w-4 h-4 flex-shrink-0 accent-blue-700"
                      />
                      <span className="text-[11px] leading-relaxed text-slate-600">
                        I understand my photo will be resized in my browser and stored with our media
                        provider (Cloudinary, USA) so it can appear on my profile and ID. I can remove
                        it at any time. See the{' '}
                        <a
                          href="/legal/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 text-blue-700 hover:text-blue-800"
                        >
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoBusy || !photoConsent}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <Camera className="w-3.5 h-3.5" aria-hidden />
                        {student.photoUrl ? 'Change photo' : 'Upload photo'}
                      </button>
                      {student.photoUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          disabled={photoBusy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 border border-red-200 bg-white hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden /> Remove
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handlePickPhoto}
                      aria-label="Choose a profile photo"
                    />
                  </div>
                </div>

                <Field id="settings-email" icon={Mail} label="Email">
                  <input
                    id="settings-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>

                <Field id="settings-phone" icon={Phone} label="Phone">
                  <input
                    id="settings-phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>

                <Field id="settings-address" icon={MapPin} label="Address">
                  <textarea
                    id="settings-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </Field>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Emergency contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field id="settings-emergency-name" icon={UsersIcon} label="Contact name">
                      <input
                        id="settings-emergency-name"
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </Field>
                    <Field id="settings-emergency-number" icon={Phone} label="Contact number">
                      <input
                        id="settings-emergency-number"
                        type="tel"
                        autoComplete="tel"
                        value={emergencyNumber}
                        onChange={(e) => setEmergencyNumber(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Check className="w-4 h-4" aria-hidden />}
                    {savingProfile ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security section */}
          {activeSection === 'security' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Change password</h2>
                <p className="text-xs text-slate-500 mt-0.5">Use at least 6 characters. Mix letters and numbers for stronger security.</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                <Field id="settings-current-password" label="Current password">
                  <div className="relative">
                    <input
                      id="settings-current-password"
                      type={showCurrent ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(v => !v)}
                      aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                    </button>
                  </div>
                </Field>

                <Field id="settings-new-password" label="New password">
                  <div className="relative">
                    <input
                      id="settings-new-password"
                      type={showNew ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      aria-label={showNew ? 'Hide new password' : 'Show new password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                    </button>
                  </div>
                </Field>

                <Field id="settings-confirm-password" label="Confirm new password">
                  <div className="relative">
                    <input
                      id="settings-confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-500 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                    </button>
                  </div>
                </Field>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Lock className="w-4 h-4" aria-hidden />}
                    {savingPassword ? 'Changing...' : 'Change password'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications section */}
          {activeSection === 'notifications' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">Notification preferences</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose how you want to be notified about portal updates.</p>
              </div>
              <div className="px-6 py-5 space-y-1">
                <ToggleRow
                  label="Email notifications"
                  description="Receive emails about enrollment, grades, and announcements"
                  checked={emailNotifs}
                  onChange={setEmailNotifs}
                />
                <ToggleRow
                  label="SMS notifications"
                  description="Get text alerts for urgent notices and deadlines"
                  checked={smsNotifs}
                  onChange={setSmsNotifs}
                />
                <ToggleRow
                  label="Event reminders"
                  description="Reminders before school events and holidays"
                  checked={eventReminders}
                  onChange={setEventReminders}
                />
                <ToggleRow
                  label="Task deadline alerts"
                  description="Notifications when task due dates are approaching"
                  checked={taskDeadlines}
                  onChange={setTaskDeadlines}
                />
              </div>
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
                <p className="text-[11px] text-slate-500">Notification preferences will be saved to your account when the notifications system is fully activated.</p>
              </div>
            </div>
          )}

          {/* Privacy & Data section — the in-app home for the legal
              documents, the analytics consent switch, and the data
              subject rights (export / erasure request). */}
          {activeSection === 'privacy' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-900">Documents</h2>
                  <p className="text-xs text-slate-500 mt-0.5">The policies that govern this portal and your data.</p>
                </div>
                <div className="px-6 py-4">
                  <ul className="space-y-2">
                    {POLICY_PAGES.map((p) => (
                      <li key={p.href}>
                        <a
                          href={p.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          {p.label}
                          <ExternalLink className="w-4 h-4 text-slate-400" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3">
                    <Cookie className="w-4 h-4 text-slate-400 shrink-0" aria-hidden />
                    <CookieSettingsButton className="text-sm font-medium text-slate-700 hover:text-slate-900" label="Change cookie & analytics settings" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-900">Your data rights</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Access and control the data held in your account.</p>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Download className="w-4 h-4" aria-hidden />}
                    {exporting ? 'Preparing export...' : 'Download my data'}
                  </button>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Exports your account profile{student.role === 'student' ? ', grades, tasks, attendance, and notifications' : ''} as a
                    JSON file, generated on demand.
                  </p>
                  <a
                    href={`mailto:${LEGAL.operatorEmail}?subject=${encodeURIComponent('AICS Portal data deletion request')}&body=${encodeURIComponent(`Please delete or deactivate my account data.\n\nUsername: ${student.username}\nBranch: ${student.branch}\n\n(You may be asked to verify your identity before the request is processed.)`)}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-700 border border-red-200 bg-white hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                    Request data deletion
                  </a>
                  <p className="text-[11px] leading-relaxed text-slate-500">
                    Opens your email app with a pre-filled request to the operator
                    ({LEGAL.operatorEmail}). Identity is verified before any deletion, and grade
                    records the school still requires may be anonymized instead of deleted.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
    </PortalShell>
  )
}

function Field({ id, icon: Icon, label, children }: { id: string; icon?: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" aria-hidden />}
        {label}
      </label>
      {children}
    </div>
  )
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-b-0">
      <div className="min-w-0 pr-4">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

// Center-crop to a square and downscale to `max` px, encoded as JPEG —
// avatars stay small and consistent no matter what the camera produced.
async function squareResize(file: File, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const size = Math.max(1, Math.round(side * Math.min(1, max / side)))
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process the image.')
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size
  )
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('Your browser could not process the image.')
  return blob
}
