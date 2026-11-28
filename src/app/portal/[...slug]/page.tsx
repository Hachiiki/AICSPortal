import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import RootPage from '@/app/page'
import { SESSION_COOKIE } from '@/lib/session'
import { readAuthedSession } from '@/lib/session-auth'

export default async function PortalCatchAll({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug: [branch, role, username] } = await params

  if (role === 'admin') {
    const token = (await cookies()).get(SESSION_COOKIE)?.value
    const session = token ? await readAuthedSession(token) : null
    if (session?.role !== 'admin' || session.branch !== branch || session.username !== username) {
      redirect('/')
    }
  }

  return <RootPage />
}
