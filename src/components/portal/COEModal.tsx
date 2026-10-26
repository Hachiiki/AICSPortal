'use client'

import { useCallback, useId } from 'react'
import { motion } from 'framer-motion'
import { FileText, Printer, Download, X } from 'lucide-react'
import type { Student } from '@/lib/aics/types'
import { PALETTE } from '@/lib/aics/palette'
import { DialogPanel } from './DialogPanel'
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
  const titleId = useId()
  const descId = useId()

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      /* Stage 2C: NO no-print here. `display: none` on an ancestor
         suppresses ALL descendants — including this modal's
         .coe-print-area, which the @media print rules re-enable with
         visibility only (visibility is inheritable-overridable;
         display is not). With no-print on the backdrop, printing
         emitted blank pages in BOTH themes (pre-existing defect found
         by the Stage 2C print validation). The backdrop itself stays
         hidden in print via the `body * { visibility: hidden }` rule,
         and its rgba backdrop does not print (printBackground off). */
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(21,51,87,0.55)' }}
      onClick={onClose}
    >
      <DialogPanel
        onClose={onClose}
        aria-labelledby={titleId}
        aria-describedby={descId}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header — app chrome (not part of the printed document:
            carries no-print). Stage 2C theme-awareness: the brand-literal
            light hexes are kept exact (same values the inline styles had);
            dark counterparts use the semantic tokens (ink / line / link /
            slate-500 bridge), the Stage-2B idiom. */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b no-print border-[#D2D2D3] dark:border-line"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#287CBB] dark:text-link" aria-hidden />
            <h2 id={titleId} className="font-bold text-sm text-[#153357] dark:text-ink">
              Certificate of Enrollment
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ background: PALETTE.ocean }}
            >
              <Printer className="w-3.5 h-3.5" aria-hidden /> Print
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 border border-[#D2D2D3] dark:border-line text-[#153357] dark:text-ink"
            >
              <Download className="w-3.5 h-3.5" aria-hidden /> Save as PDF
            </button>
            <button
              onClick={onClose}
              aria-label="Close certificate preview"
              className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-[#6b7280] dark:text-slate-500"
            >
              <X className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* SR context for the dialog: what this document is and is not. */}
        <p id={descId} className="sr-only">
          Unofficial, system-generated certificate preview. Not a school issuance; no registrar
          signature or seal. Printing is for personal reference only.
        </p>

        {/* COE document */}
        <div className="overflow-y-auto p-8 coe-print-area">
          <COEDocument student={student} />
        </div>
      </DialogPanel>
    </motion.div>
  )
}
