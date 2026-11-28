export async function POST() {
  return Response.json({ ok: false, error: 'Photo cleanup is handled when updating or removing your photo.' }, { status: 410 })
}
