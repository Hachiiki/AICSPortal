'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ANNOUNCEMENT_STYLES, announcementImageUrl, type Announcement } from '@/lib/aics/announcements'

type NoticeState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; post: Announcement }

export function AnnouncementDetails({ id }: { id: string }) {
  const [state, setState] = useState<NoticeState>({ kind: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const response = await fetch(`/api/announcements/${encodeURIComponent(id)}`, { signal: controller.signal })
        if (response.status === 401) {
          setState({ kind: 'error', message: 'Sign in to read this announcement.' })
          return
        }
        if (response.status === 404) {
          setState({ kind: 'error', message: 'This announcement is no longer available.' })
          return
        }
        if (!response.ok) throw new Error('Announcement request failed')
        const { announcement } = await response.json() as { announcement: Announcement }
        setState({ kind: 'ready', post: announcement })
      } catch {
        if (!controller.signal.aborted) setState({ kind: 'error', message: 'The announcement could not load. Refresh the page to try again.' })
      }
    })()
    return () => controller.abort()
  }, [id])

  const published = state.kind === 'ready' ? new Date(state.post.postedDate) : null
  return (
    <main data-portal-page-enter className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-8">
      <Link href="/" prefetch={false} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded text-sm font-medium text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-link">
        <ArrowLeft className="size-4" aria-hidden />
        Back to dashboard
      </Link>
      {state.kind === 'loading' && <p role="status" className="text-sm text-muted-fg">Loading announcement…</p>}
      {state.kind === 'error' && <p role="alert" className="rounded-xl border border-line bg-surface p-5 text-sm text-ink">{state.message}</p>}
      {state.kind === 'ready' && (
        <article data-portal-motion-group className="space-y-5 rounded-2xl border border-line bg-surface p-5 text-ink sm:p-8">
          <header className="space-y-2">
            <p className="text-sm font-semibold text-link">{ANNOUNCEMENT_STYLES[state.post.category]?.label ?? 'Announcement'}</p>
            <h1 className="text-2xl leading-tight font-bold tracking-tight [overflow-wrap:anywhere] sm:text-3xl">{state.post.title}</h1>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-muted-fg">
              <span>{state.post.author}</span>
              {published && Number.isFinite(published.getTime()) && (
                <time dateTime={published.toISOString()}>{published.toLocaleDateString('en-PH', { dateStyle: 'long' })}</time>
              )}
            </div>
          </header>
          {state.post.image && (
            <img
              src={announcementImageUrl(state.post._id)}
              alt={state.post.image.alt}
              className="mx-auto max-h-[65dvh] max-w-full rounded-lg object-contain"
            />
          )}
          <p className="text-base leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">{state.post.body}</p>
        </article>
      )}
    </main>
  )
}
