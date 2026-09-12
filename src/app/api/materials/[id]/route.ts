import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/mongodb/connection'
import { getAuthedSession as getSession } from '@/lib/session-auth'
import { requireTeachingFaculty } from '@/app/api/tasks/route'
import type { MongoMaterial } from '@/lib/mongodb/types'
import { destroyAsset } from '../cloudinary'

// ============================================================
//  Materials delete — DELETE /api/materials/[id]?username=
// ============================================================
//
//  Faculty only (session): the doc's subject must be in the
//  session user's teaching load, same branch. File assets are
//  destroyed in Cloudinary best-effort; the record goes away
//  regardless so a Cloudinary hiccup never strands a delete.
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    const username = request.nextUrl.searchParams.get('username') || session.username
    // BUG-010: id/username must be plain strings before ObjectId()/filters.
    if (typeof id !== 'string' || !id || typeof username !== 'string' || !username) {
      return NextResponse.json({ ok: false, error: 'Material id and username are required.' }, { status: 400 })
    }
    if (username !== session.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    let oid: ObjectId
    try {
      oid = new ObjectId(id)
    } catch {
      return NextResponse.json({ ok: false, error: 'Material not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoMaterial>('materials')
    const doc = (await col.findOne({ _id: oid } as any)) as MongoMaterial | null
    if (!doc) {
      return NextResponse.json({ ok: false, error: 'Material not found.' }, { status: 404 })
    }
    if (doc.branch !== session.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    const check = await requireTeachingFaculty(session.username, session.branch, doc.subjectCode)
    if (check.error) return check.error

    if (doc.kind === 'file' && doc.publicId && (doc.resourceType === 'image' || doc.resourceType === 'raw')) {
      await destroyAsset(doc.publicId, doc.resourceType)
    }
    // Branch-scoped write: the filter re-asserts the tenant.
    await col.deleteOne({ _id: oid, branch: session.branch } as any)
    return NextResponse.json({ ok: true, message: 'Material deleted.' })
  } catch (err) {
    console.error('Material delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to delete material.' }, { status: 500 })
  }
}
