import { createHash, createHmac, randomUUID } from 'node:crypto'
import { ObjectId } from 'mongodb'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import { HttpError } from '@/lib/http'
import { verifyRawUpload } from '@/lib/raw-upload'

export const MATERIALS_MAX_BYTES = 10 * 1024 * 1024
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024
export const IMAGE_FORMATS = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const
export const RAW_FORMATS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'zip'] as const
export const uploadTokenSchema = z.string().min(1).max(4096)

const CLOUDINARY_API = 'https://api.cloudinary.com/v1_1'
const CLOUDINARY_DELIVERY = 'res.cloudinary.com'
const UPLOAD_AUDIENCE = 'aics-cloudinary-upload'
const ID_SEGMENT = /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,127}$/
const formatMatches = (expected: string, actual: string) => expected.replace('jpeg', 'jpg') === actual.replace('jpeg', 'jpg')

type CloudinaryEnv = { cloudName: string; apiKey: string; apiSecret: string; baseFolder: string }
export type UploadResource = 'image' | 'raw'
type UploadOwner = { username: string; branch: string }
export type UploadScope =
  | { kind: 'material'; subjectCode: string; academicYear: string; semester: string }
  | { kind: 'photo'; revision: string | null }

export function cloudinaryEnv(): CloudinaryEnv | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()
  const baseFolder = process.env.CLOUDINARY_FOLDER?.trim() || 'aics-portal/materials'
  if (!cloudName || !/^[a-zA-Z0-9_-]+$/.test(cloudName) || !apiKey || !apiSecret || !validPublicId(baseFolder)) return null
  return { cloudName, apiKey, apiSecret, baseFolder }
}

export function uploadPreset(kind: UploadScope['kind'], resourceType: UploadResource): string | null {
  const preset = kind === 'photo' ? process.env.CLOUDINARY_PHOTO_UPLOAD_PRESET :
    resourceType === 'image' ? process.env.CLOUDINARY_MATERIAL_IMAGE_UPLOAD_PRESET : process.env.CLOUDINARY_MATERIAL_RAW_UPLOAD_PRESET
  return preset && /^[a-zA-Z0-9_-]{1,100}$/.test(preset) ? preset : null
}

export function materialUploadsConfigured(): boolean {
  return Boolean(cloudinaryEnv() && uploadPreset('material', 'image') && uploadPreset('material', 'raw'))
}

// Encode uncommon names with a hash prefix in their own namespace. Removing
// punctuation alone would map two separately authorized scopes to one folder.
function folderSegment(value: string): string {
  if (ID_SEGMENT.test(value) && !value.startsWith('aics-id-')) return value
  return `aics-id-${createHash('sha256').update(value).digest('hex')}`
}

export function materialFolder(baseFolder: string, branch: string, subjectCode: string): string {
  return `${baseFolder}/${folderSegment(branch)}/${folderSegment(subjectCode)}`
}

export function photoFolder(baseFolder: string, branch: string, username: string): string {
  const root = baseFolder.split('/').slice(0, -1).join('/') || 'aics-portal'
  return `${root}/photos/${folderSegment(branch)}/${folderSegment(username)}`
}

function validPublicId(publicId: string): boolean {
  return publicId.length <= 255 && publicId.split('/').every((part) => ID_SEGMENT.test(part))
}

function directChild(publicId: string, folder: string): boolean {
  return validPublicId(publicId) && publicId.startsWith(`${folder}/`) && !publicId.slice(folder.length + 1).includes('/')
}

export function safeHttpUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2000 || /[\u0000-\u001f\u007f]/.test(value)) return null
  if (!/^https?:\/\//i.test(value.trim())) return null
  try {
    const url = new URL(value.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.href.length > 2000) return null
    return url
  } catch {
    return null
  }
}

export function isPortalCloudUrl(url: URL): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  if (!cloudName || url.hostname !== CLOUDINARY_DELIVERY) return false
  try {
    return decodeURIComponent(url.pathname.split('/')[1]) === cloudName
  } catch {
    return false
  }
}

function canonicalAssetUrl(env: CloudinaryEnv, value: unknown, publicId: string, resource: UploadResource, format: string): string | null {
  const url = safeHttpUrl(value)
  if (!url || url.origin !== `https://${CLOUDINARY_DELIVERY}` || url.search || url.hash) return null
  const prefix = `/${env.cloudName}/${resource}/upload/`
  if (!url.pathname.startsWith(prefix)) return null
  const name = resource === 'image' ? `${publicId}.${format}` : publicId
  const path = url.pathname.slice(prefix.length).replace(/^v[0-9]+\//, '')
  return path === name ? url.href : null
}

const uploadGrantSchema = z.object({
  jti: z.string().regex(/^[a-f0-9]{24}$/),
  publicId: z.string(),
  resourceType: z.enum(['image', 'raw']),
  format: z.string(),
  revision: z.string().nullable().optional(),
  academicYear: z.string().optional(),
  semester: z.string().optional(),
  subjectCode: z.string().optional(),
  kind: z.enum(['material', 'photo']),
  branch: z.string(),
})

type UploadGrant = z.infer<typeof uploadGrantSchema>

function grantKey(env: CloudinaryEnv) {
  return createHmac('sha256', env.apiSecret).update(UPLOAD_AUDIENCE).digest()
}

function uploadFolder(env: CloudinaryEnv, owner: UploadOwner, scope: UploadScope) {
  return scope.kind === 'photo' ? photoFolder(env.baseFolder, owner.branch, owner.username) :
    materialFolder(env.baseFolder, owner.branch, scope.subjectCode)
}

export async function prepareUpload(env: CloudinaryEnv, owner: UploadOwner, scope: UploadScope, resourceType: UploadResource, format: string) {
  const preset = uploadPreset(scope.kind, resourceType)
  if (!preset) throw new HttpError(503, 'File uploads are not configured.')
  const id = new ObjectId().toHexString()
  const publicId = `${uploadFolder(env, owner, scope)}/${randomUUID()}${resourceType === 'raw' ? `.${format}` : ''}`
  if (!validPublicId(publicId)) throw new HttpError(503, 'The upload folder is not configured correctly.')
  const uploadParams = {
    allowed_formats: format === 'jpg' || format === 'jpeg' ? 'jpg,jpeg' : format,
    overwrite: 'false',
    public_id: publicId,
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: 'upload',
    upload_preset: preset,
  }
  const params = Object.entries(uploadParams).map(([key, value]) => `${key}=${value}`).join('&')
  const signature = createHash('sha256').update(`${params}${env.apiSecret}`).digest('hex')
  const uploadToken = await new SignJWT({ ...scope, branch: owner.branch, publicId, resourceType, format })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(UPLOAD_AUDIENCE)
    .setSubject(owner.username)
    .setJti(id)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(grantKey(env))
  return { apiKey: env.apiKey, signature, uploadParams, uploadToken, uploadUrl: `${CLOUDINARY_API}/${env.cloudName}/${resourceType}/upload` }
}

export async function verifyUploadGrant(env: CloudinaryEnv, token: string, owner: UploadOwner, scope: UploadScope): Promise<UploadGrant> {
  try {
    const { payload } = await jwtVerify(token, grantKey(env), {
      algorithms: ['HS256'], audience: UPLOAD_AUDIENCE, subject: owner.username, requiredClaims: ['exp', 'iat', 'jti'],
    })
    const grant = uploadGrantSchema.parse(payload)
    if (grant.kind !== scope.kind || grant.branch !== owner.branch || !directChild(grant.publicId, uploadFolder(env, owner, scope))) throw new Error()
    if (scope.kind === 'material' && (grant.subjectCode !== scope.subjectCode || grant.academicYear !== scope.academicYear || grant.semester !== scope.semester)) throw new Error()
    return grant
  } catch {
    throw new HttpError(400, 'The upload request is invalid or expired. Choose the file again.')
  }
}

const cloudAssetSchema = z.object({
  asset_id: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
  public_id: z.string(),
  resource_type: z.enum(['image', 'raw']),
  type: z.literal('upload'),
  bytes: z.number().int().positive(),
  format: z.string().optional(),
  secure_url: z.string(),
})

function basicAuth(env: CloudinaryEnv) {
  return `Basic ${Buffer.from(`${env.apiKey}:${env.apiSecret}`).toString('base64')}`
}

export async function verifyUploadedAsset(env: CloudinaryEnv, grant: UploadGrant, maxBytes: number) {
  let data: unknown
  try {
    const response = await fetch(`${CLOUDINARY_API}/${env.cloudName}/resources/${grant.resourceType}/upload/${encodeURIComponent(grant.publicId)}`, {
      headers: { Authorization: basicAuth(env) },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    })
    if (response.status === 404) throw new HttpError(400, 'The uploaded file could not be found.')
    if (!response.ok) throw new Error(`Cloudinary asset lookup returned ${response.status}`)
    data = await response.json()
  } catch (error) {
    if (error instanceof HttpError) throw error
    console.error('Cloudinary asset verification failed.')
    throw new HttpError(503, 'The upload could not be verified. Try again shortly.')
  }
  const parsed = cloudAssetSchema.safeParse(data)
  if (!parsed.success) throw new HttpError(400, 'The uploaded file metadata could not be verified.')
  const asset = parsed.data
  const actualFormat = asset.format ?? (grant.resourceType === 'raw' ? asset.public_id.split('.').pop() : undefined)
  const url = actualFormat && canonicalAssetUrl(env, asset.secure_url, grant.publicId, grant.resourceType, actualFormat)
  if (!url || !actualFormat || asset.public_id !== grant.publicId || asset.resource_type !== grant.resourceType || !formatMatches(grant.format, actualFormat)) {
    throw new HttpError(415, 'The uploaded file type does not match the allowed format.')
  }
  if (asset.bytes > maxBytes) throw new HttpError(413, `Files must be ${maxBytes / (1024 * 1024)} MB or less.`)
  if (asset.resource_type === 'raw') await verifyRawUpload(url, asset.bytes, actualFormat)
  return { assetId: asset.asset_id, publicId: asset.public_id, resourceType: asset.resource_type, bytes: asset.bytes, format: actualFormat, url }
}

// An immutable asset ID is saved only after provider verification. Legacy URL
// or public-ID fields and failed browser uploads never authorize destruction.
export async function destroyVerifiedAsset(env: CloudinaryEnv | null, assetId: unknown): Promise<void> {
  if (!env || typeof assetId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(assetId)) return
  try {
    const response = await fetch(`${CLOUDINARY_API}/${env.cloudName}/asset/destroy`, {
      method: 'POST', headers: { Authorization: basicAuth(env), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ asset_id: assetId, invalidate: 'true' }),
      redirect: 'error', signal: AbortSignal.timeout(5000),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok || (data?.result !== 'ok' && data?.result !== 'not found')) {
      console.error('Cloudinary asset cleanup failed:', response.status)
    }
  } catch (error) {
    console.error('Cloudinary asset cleanup failed.')
  }
}
