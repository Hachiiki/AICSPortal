'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { Search } from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { GlobalSearch } from './GlobalSearch'

type MobileSearchProps = Omit<ComponentProps<typeof GlobalSearch>, 'surface' | 'onSelect' | 'onEscape'> & {
  className: string
}

export function MobileSearch({ className, ...searchProps }: MobileSearchProps) {
  const [open, setOpen] = useState(false)
  const selected = useRef(false)
  const panel = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function onShortcut(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
      if (trigger.current?.closest('[inert]') || document.querySelector('[role="dialog"][aria-modal="true"]')) return
      event.preventDefault()
      selected.current = false
      setOpen(true)
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    function update() {
      panel.current?.style.setProperty('--search-visible-height', `${viewport?.height ?? window.innerHeight}px`)
      panel.current?.style.setProperty('--search-visible-top', `${viewport?.offsetTop ?? 0}px`)
    }
    update()
    viewport?.addEventListener('resize', update)
    viewport?.addEventListener('scroll', update)
    return () => {
      viewport?.removeEventListener('resize', update)
      viewport?.removeEventListener('scroll', update)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={next => {
      if (next) selected.current = false
      setOpen(next)
    }}>
      <DialogTrigger asChild>
        <button ref={trigger} type="button" aria-label="Open portal search" className={className}>
          <Search className="size-5" aria-hidden="true" />
          <span>Search</span>
        </button>
      </DialogTrigger>
      <DialogContent
        ref={panel}
        className="top-[calc(var(--search-visible-top,0px)+12px)] flex max-h-[calc(var(--search-visible-height,100dvh)-24px)] w-[calc(100%-16px)] max-w-none translate-y-0 flex-col gap-3 p-3 motion-reduce:animate-none [&>button]:size-11 [&>button]:top-2 [&>button]:right-2"
        onOpenAutoFocus={event => {
          event.preventDefault()
          panel.current?.querySelector<HTMLInputElement>('input')?.focus()
        }}
        onCloseAutoFocus={event => { if (selected.current) event.preventDefault() }}
        onEscapeKeyDown={event => { if (document.activeElement?.getAttribute('role') === 'combobox') event.preventDefault() }}
      >
        <DialogHeader className="shrink-0 pr-10 text-left">
          <DialogTitle>Search the portal</DialogTitle>
          <DialogDescription>Find pages, subjects, people and coursework.</DialogDescription>
        </DialogHeader>
        <GlobalSearch {...searchProps} surface="dialog" onSelect={() => {
          selected.current = true
          setOpen(false)
        }} onEscape={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
