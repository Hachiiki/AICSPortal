import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/mongodb/connection'
import { resolveContext, createRelations, can, decisionToHttpError } from '@/lib/authz'
import { parseQuery, errResponse, selfQuerySchema, objectIdSchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoMaterial } from '@/lib/mongodb/types'
import { destroyAsset } from '../cloudinary'

// ============================================================
//  Materials delete — DELETE /api/materials/[id]?username=
// ============================================================
//
//  C2.4: faculty role + the current-term teaching-load check on the
//  FETCHED doc's subject run in the material delete policy case;
//  deletion stays by teaching load, not uploader (D3 preserved).
//  The username-self check, the fetched-doc branch parity, and the
//  {_id, branch} delete filter stay route-kept. File assets are
//  destroyed in Cloudinary best-effort; the record goes away
//  regardless so a Cloudinary hiccup never strands a delete.
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // C2.4: canonical actor first (the resource needs the fetched doc).
    const ctx = await resolveContext(request)
    if (!ctx) throw new HttpError(401, 'Unauthorized')

    const username = parseQuery(request, selfQuerySchema).username || ctx.actor.username
    // Route params are always strings; reject non-ObjectId shapes before ObjectId().
    const parsedId = objectIdSchema.safeParse(id)
    if (!username || !parsedId.success) {
      return NextResponse.json({ ok: false, error: 'Material id and username are required.' }, { status: 400 })
    }
    if (username !== ctx.actor.username) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }
    let oid: ObjectId
    try {
      oid = new ObjectId(parsedId.data)
    } catch {
      return NextResponse.json({ ok: false, error: 'Material not found.' }, { status: 404 })
    }
    const col = await getCollection<MongoMaterial>('materials')
    const doc = (await col.findOne({ _id: oid } as any)) as MongoMaterial | null
    if (!doc) {
      return NextResponse.json({ ok: false, error: 'Material not found.' }, { status: 404 })
    }
    if (doc.branch !== ctx.claims.branch) {
      return NextResponse.json({ ok: false, error: 'Branch mismatch' }, { status: 403 })
    }
    // C2.4: faculty role + teaching load on the fetched doc's subject
    // centralized (material delete, by load not uploader, D3).
    const gate = decisionToHttpError(
      await can(ctx, createRelations(ctx), { kind: 'material', id, subjectCode: doc.subjectCode }, 'delete')
    )
    if (gate) throw gate

    if (doc.kind === 'file' && doc.publicId && (doc.resourceType === 'image' || doc.resourceType === 'raw')) {
      await destroyAsset(doc.publicId, doc.resourceType)
    }
    // Branch-scoped write: the filter re-asserts the tenant.
    await col.deleteOne({ _id: oid, branch: ctx.claims.branch } as any)
    return NextResponse.json({ ok: true, message: 'Material deleted.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Material delete error:', err)
    return NextResponse.json({ ok: false, error: 'Failed to delete material.' }, { status: 500 })
  }
}
