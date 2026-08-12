'use client'

import { useLayoutEffect, useRef, useState } from 'react'

interface FitTextProps {
  /** Starting font size in cqw (container query width units) */
  maxCqw: number
  /** Minimum font size in cqw — shrinking stops here */
  minCqw: number
  className?: string
  children: React.ReactNode
  /** When true, checks scrollHeight instead of scrollWidth */
  multiline?: boolean
}

/**
 * Auto-shrinking text component. Renders a <span> whose font-size
 * starts at maxCqw and decrements by 0.2cqw until the text fits
 * within its container (single-line: scrollWidth ≤ clientWidth;
 * multiline: scrollHeight ≤ clientHeight).
 *
 * Uses useLayoutEffect + ResizeObserver to re-check on container
 * resize. SSR renders at maxCqw (no hydration mismatch).
 */
export function FitText({ maxCqw, minCqw, className, children, multiline }: FitTextProps) {
  const spanRef = useRef<HTMLSpanElement>(null)
  const [size, setSize] = useState(maxCqw)

  useLayoutEffect(() => {
    const el = spanRef.current
    if (!el) return

    const fit = () => {
      let s = maxCqw
      el.style.fontSize = `${s}cqw`
      while (s > minCqw) {
        const fits = multiline
          ? el.scrollHeight <= el.clientHeight + 1
          : el.scrollWidth <= el.clientWidth + 1
        if (fits) break
        s -= 0.2
        el.style.fontSize = `${s}cqw`
      }
      setSize(s)
    }

    fit()

    // Re-check on container resize
    const container = el.closest('[style*="aspect-ratio"]') ?? el.parentElement
    if (container) {
      const ro = new ResizeObserver(fit)
      ro.observe(container)
      return () => ro.disconnect()
    }
  }, [maxCqw, minCqw, multiline, children])

  return (
    <span
      ref={spanRef}
      className={className}
      style={{ fontSize: `${size}cqw` }}
    >
      {children}
    </span>
  )
}
