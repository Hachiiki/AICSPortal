'use client'

import { useState } from 'react'
import {
  ChevronRight,
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student, View } from '@/lib/aics/types'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import type { PortalEvent } from '@/lib/aics/events'
import type { Professor } from '@/lib/aics/professors'
import type { Task } from '@/lib/aics/tasks'

interface SettingsPageProps {
  student: Student
  onNavigate: (view: View) => void
  onLogout: () => void
  events?: PortalEvent[]
  professors?: Professor[]
  tasks?: Task[]
}

type Section = 'profile' | 'security' | 'notifications'

export function SettingsPage({ student, onNavigate, onLogout, events, professors, tasks }: SettingsPageProps) {
  const [activeSection, setActiveSection] = useState<Section>('profile')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Profile edit state
  const [phone, setPhone] = useState(student.phone || '')
  const [email, setEmail] = useState(student.email || '')
  const [address, setAddress] = useState(student.address || '')
  const [emergencyName, setEmergencyName] = useState(student.emergencyContactName || '')
  const [emergencyNumber, setEmergencyNumber] = useState(student.emergencyContactNumber || '')
  const [savingProfile, setSavingProfile] = useState(false)

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
  ]

  return (
    <div className="min-h-dvh bg-slate-50 font-sans">
      <Sidebar
        active="settings"
        onNavigate={onNavigate}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <div className="lg:pl-60">
        <Topbar
          student={student}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onProfile={() => onNavigate('profile')}
          onNavigate={onNavigate}
          onLogout={onLogout}
          events={events}
          professors={professors}
          tasks={tasks}
        />
        <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 max-w-4xl">
          {/* Page header */}
          <div>
            <button
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3"
            >
              <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your account, security, and notification preferences
            </p>
          </div>

          {/* Section tabs */}
          <div className="inline-flex gap-1 p-1 rounded-xl bg-slate-100 mb-6">
            {sections.map((s) => {
              const Icon = s.icon
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSection(s.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all inline-flex items-center gap-2 ${
                    activeSection === s.id ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" /> {s.label}
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
                {/* Photo (read-only placeholder for now) */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ background: '#1e293b' }}>
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{student.fullName}</p>
                    <p className="text-xs text-slate-400">Photo upload coming soon</p>
                  </div>
                </div>

                <Field icon={Mail} label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>

                <Field icon={Phone} label="Phone">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>

                <Field icon={MapPin} label="Address">
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                  />
                </Field>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Emergency contact</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field icon={UsersIcon} label="Contact name">
                      <input
                        type="text"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </Field>
                    <Field icon={Phone} label="Contact number">
                      <input
                        type="tel"
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60"
                  >
                    {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
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
                <Field label="Current password">
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button type="button" onClick={() => setShowCurrent(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <Field label="New password">
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirm new password">
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 px-3 pr-10 rounded-lg border border-slate-200 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
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
        </main>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, children }: { icon?: typeof User; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
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
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-blue-600' : 'bg-slate-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
