import type { Metadata } from 'next'
import { AnnouncementDetails } from '@/components/portal/AnnouncementDetails'

export const metadata: Metadata = {
  title: 'Announcement | AICS Portal',
}

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AnnouncementDetails key={id} id={id} />
}
