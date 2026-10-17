'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
//  SelectMenu — the shared custom-styled dropdown used across
//  the whole app (filters, form fields, settings, pickers).
//
//  Extracted verbatim from the Subject filter dropdown in the
//  Academics → Tasks tab (TasksTab.tsx): same trigger, panel,
//  spacing, chevron rotation and option styling. Behavior is
//  identical (click to toggle, outside-click close, select to
//  close) with two invisible additions for reuse elsewhere:
//
//  1. Escape is handled in the capture phase and stopped, so an
//     open dropdown never simultaneously closes a surrounding
//     Modal (parity with native <select> inside dialogs).
//  2. ArrowUp/ArrowDown/Home/End move focus through the option
//     list (options remain ordinary tabbable buttons, exactly
//     like the original implementation).
// ============================================================

export interface SelectMenuOption<V extends string | number = string> {
  value: V
  label: string
}

export interface SelectMenuProps<V extends string | number = string> {
  /** Options rendered inside the dropdown panel. */
  options: ReadonlyArray<SelectMenuOption<V>>
  /** Currently selected value (controlled). */
  value: V
  /** Fired when the user picks an option. */
  onChange: (value: V) => void
  /** Optional visible label rendered above the trigger, styled like the
   *  Subject filter label. Omit when the page renders its own label. */
  label?: string
  /** Applied to the trigger button — lets an external
   *  <label htmlFor> activate the dropdown. */
  id?: string
  /** Accessible name for the trigger when no visible label is associated. */
  'aria-label'?: string
  /** Alternative to aria-label when a labelled-by id is available. */
  'aria-labelledby'?: string
  /** Rendered when `value` matches no option (e.g. empty state). */
  placeholder?: string
  disabled?: boolean
  /** Classes for the outermost wrapper (width / layout, e.g. "w-full"). */
  className?: string
  /** Extra trigger classes. Conflicts resolve via tailwind-merge,
   *  so "w-auto" cleanly replaces the default "w-full". */
  buttonClassName?: string
  /** Extra panel classes — e.g. "z-30" to layer above sticky table cells. */
  panelClassName?: string
  /** Forwarded to the trigger button (focus management, e.g. a Modal's
   *  initialFocusRef). React 19 ref-as-prop. */
  ref?: Ref<HTMLButtonElement>
}

export function SelectMenu<V extends string | number = string>({
  options,
  value,
  onChange,
  label,
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  placeholder = '',
  disabled = false,
  className,
  buttonClassName,
  panelClassName,
  ref,
}: SelectMenuProps<V>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const autoId = useId()
  const triggerId = id ?? autoId
  const labelId = `${triggerId}-label`
  // Which option to focus the moment the panel mounts after a
  // keyboard-open (ArrowDown → first, ArrowUp → last).
  const pendingFocusRef = useRef<number | null>(null)

  const selected = options.find((o) => o.value === value)
  const display = selected ? selected.label : placeholder

  const optionButtons = (): HTMLButtonElement[] =>
    Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button[role="option"]:not([disabled])') ?? [])

  const focusOption = (index: number) => {
    const buttons = optionButtons()
    if (buttons.length === 0) return
    const i = ((index % buttons.length) + buttons.length) % buttons.length
    buttons[i]?.focus()
  }

  // Outside click + Escape — registered only while open, like the
  // original implementation. Escape runs in the CAPTURE phase so it
  // stops before a surrounding Modal's own Escape handler.
  useEffect(() => {
    if (!open) return
    const onMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [open])

  // Focus the first/last option right after a keyboard-open renders.
  useEffect(() => {
    if (!open || pendingFocusRef.current === null) return
    const index = pendingFocusRef.current
    pendingFocusRef.current = null
    focusOption(index)
  }, [open])

  const openWithKeyboard = (index: number) => {
    if (disabled) return
    pendingFocusRef.current = index
    setOpen(true)
  }

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) openWithKeyboard(0)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) openWithKeyboard(-1)
    }
  }

  // Roving focus through the option list (ArrowUp/Down wrap, Home/End jump).
  const onListKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = optionButtons()
    if (buttons.length === 0) return
    const currentIndex = buttons.findIndex((b) => b === e.target)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      focusOption(currentIndex < 0 ? 0 : currentIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusOption(currentIndex < 0 ? buttons.length - 1 : currentIndex - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      focusOption(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      focusOption(buttons.length - 1)
    }
  }

  const select = (v: V) => {
    onChange(v)
    setOpen(false)
    triggerRef.current?.focus()
  }

  const setTriggerRef = (node: HTMLButtonElement | null) => {
    triggerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as { current: HTMLButtonElement | null }).current = node
  }

  const trigger = (
    <button
      type="button"
      id={triggerId}
      ref={setTriggerRef}
      onClick={() => !disabled && setOpen((v) => !v)}
      onKeyDown={onTriggerKeyDown}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy ?? (label ? labelId : undefined)}
      disabled={disabled}
      className={cn(
        'min-w-56 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-left text-slate-700 flex items-center justify-between gap-2 hover:border-slate-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
        buttonClassName,
      )}
    >
      <span className="truncate">{display}</span>
      <ChevronDown
        className={cn(
          'w-4 h-4 text-slate-500 flex-shrink-0 transition-transform duration-200',
          open && 'rotate-180',
        )}
      />
    </button>
  )

  const panel = open && !disabled && (
    <div
      ref={listRef}
      role="listbox"
      aria-labelledby={label ? labelId : triggerId}
      onKeyDown={onListKeyDown}
      className={cn(
        'absolute mt-2 w-full min-w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-20 max-h-64 overflow-auto',
        panelClassName,
      )}
    >
      {options.map((o) => {
        const isSelected = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => select(o.value)}
            className={cn(
              'w-full text-left px-4 py-2 text-sm flex items-center justify-between gap-2 hover:bg-slate-50',
              isSelected ? 'text-blue-700 font-medium' : 'text-slate-700',
            )}
          >
            <span className="truncate">{o.label}</span>
            {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
          </button>
        )
      })}
    </div>
  )

  if (label) {
    return (
      <div className={cn('flex flex-col gap-1', className)} ref={rootRef}>
        <label id={labelId} htmlFor={triggerId} className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">
          {label}
        </label>
        <div className="relative">
          {trigger}
          {panel}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      {trigger}
      {panel}
    </div>
  )
}
