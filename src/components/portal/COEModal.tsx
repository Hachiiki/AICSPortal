'use client'

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { FileText, Printer, Download, X } from 'lucide-react'
import type { Student } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { COEDocument } from './COEDocument'

interface COEModalProps {
  student: Student
  onClose: () => void
}

/**
 * Modal dialog that previews the Certificate of Enrollment.
 * Provides Print and Save as PDF buttons — both trigger `window.print()`,
 * which uses the `@media print` CSS rule to print only the COE document.
 */
export function COEModal({ student, onClose }: COEModalProps) {
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
