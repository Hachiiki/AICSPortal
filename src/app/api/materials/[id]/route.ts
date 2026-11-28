import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/mongodb/connection'
import { requireRole, can, decisionToHttpError } from '@/lib/authz'
import { parseQuery, errResponse, selfQuerySchema, objectIdSchema } from '@/lib/validation'
import { HttpError } from '@/lib/http'
import type { MongoMaterial } from '@/lib/mongodb/types'
import { cloudinaryEnv, destroyVerifiedAsset } from '../cloudinary'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { username } = parseQuery(request, selfQuerySchema)
    const { ctx, rel } = await requireRole(request, 'faculty', { claimedIdentity: username || undefined })
    const parsedId = objectIdSchema.safeParse(id)
    if (!parsedId.success) throw new HttpError(400, 'A valid material id is required.')
    const target = { _id: new ObjectId(parsedId.data), branch: ctx.actor.branch, deletedAt: null }
    const col = await getCollection<MongoMaterial>('materials')
    const doc: MongoMaterial | null = await col.findOne(target)
    if (!doc) throw new HttpError(404, 'Material not found.')
    const gate = decisionToHttpError(await can(ctx, rel, { kind: 'material', id, subjectCode: doc.subjectCode }, 'delete'))
    if (gate) throw gate

    const scoped = { ...target, subjectCode: doc.subjectCode }
    if (doc.kind === 'file' && doc.assetId) {
      // Claim the deletion atomically before cleanup. The marker also
      // prevents re-finalizing the same upload grant after deletion.
      const result = await col.updateOne({ ...scoped, assetId: doc.assetId }, { $set: { deletedAt: new Date() } })
      if (result.matchedCount === 0) throw new HttpError(404, 'Material not found.')
      const env = cloudinaryEnv()
      if (env && doc.assetCloud === env.cloudName) await destroyVerifiedAsset(env, doc.assetId)
    } else {
      const result = await col.deleteOne(scoped)
      if (result.deletedCount === 0) throw new HttpError(404, 'Material not found.')
    }
    return NextResponse.json({ ok: true, message: 'Material deleted.' })
  } catch (err) {
    if (err instanceof HttpError) return errResponse(err)
    console.error('Material delete error.')
    return NextResponse.json({ ok: false, error: 'Failed to delete material.' }, { status: 500 })
  }
}
