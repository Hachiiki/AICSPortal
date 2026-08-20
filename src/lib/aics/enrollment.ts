// Client-side enrollment type for the enrollment page.
// Mirrors the server MongoEnrollment but uses plain strings.

export type EnrollmentStepStatus = 'completed' | 'current' | 'upcoming'
export type PaymentStatus = 'paid' | 'partial' | 'unpaid'

export interface EnrollmentStep {
  step: number
  label: string
  description: string
  status: EnrollmentStepStatus
  date: string | null
}

export interface MiscFee {
  description: string
  amount: number
}

export interface Assessment {
  tuitionPerUnit: number
  totalUnits: number
  tuitionAmount: number
  miscFees: MiscFee[]
  totalAssessment: number
  amountPaid: number
  balance: number
  paymentStatus: PaymentStatus
  paymentDeadline: string | null
  paymentDate: string | null
}

export interface Registrar {
  name: string
  room: string
  officeHours: string
  email: string
  phone: string
}

export interface Enrollment {
  currentStep: number
  steps: EnrollmentStep[]
  assessment: Assessment
  registrar: Registrar
  academicYear: string
  semester: string
}
