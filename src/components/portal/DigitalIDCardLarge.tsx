'use client'

import type { Student } from '@/lib/aics/types'
import { StudentIdCard } from './StudentIdCard'

interface DigitalIDCardLargeProps {
  student: Student
}

/**
 * Enlarged version of the digital ID card shown in a dialog when the
 * user clicks "View Digital ID". Delegates to StudentIdCard which
 * renders the official template overlay.
 */
export function DigitalIDCardLarge({ student }: DigitalIDCardLargeProps) {
  return <StudentIdCard student={student} className="max-w-md mx-auto" />
}
