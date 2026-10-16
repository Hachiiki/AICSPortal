// Content moderation — configuration and policy tables.
//
// One shared module for every write surface that persists user text
// (announcements, section notifications, task text, profile fields,
// material links). Server-side only: the routes call moderateContent()
// next to their Zod validation; the frontend never decides.
//
// Five rule sets from the TODO epic:
//   1. profanity / abusive language      -> rule id 'profanity'
//   2. harassment / discriminatory        -> rule id 'harassment'
//   3. sexual-content classification      -> rule id 'sexual'
//   4. website / URL restrictions         -> rule id 'url-restriction'
//   5. allowlist false-positive guard     -> see allowlist.ts (never a
//      violation; it suppresses 1-4 and is logged as an allow decision)
//
// Action semantics (v1, per the owner-approved defaults 2026-10-16):
//   'reject' — the write is refused with a 4xx naming the rule. Reserved
//              for harassment and sexual content.
//   'flag'   — the write is also refused (a flagged submission never
//              silently persists), but with a "held for review" message,
//              and the decision is logged with reviewPending=true so an
//              admin can follow up with the author. Default for profanity
//              and untrusted-domain links.
// Both actions block persistence; the difference is tone, log priority,
// and the follow-up workflow. Relaxing 'flag' to allow-and-mark later is
// a config change per surface, not a rearchitecture.

export type RuleId = 'profanity' | 'harassment' | 'sexual' | 'url-restriction'

export type RuleAction = 'reject' | 'flag'

/** Moderated write surfaces (the TODO epic scope). */
export type Surface =
  | 'announcement'
  | 'section-notification'
  | 'task'
  | 'profile'
  | 'material-link'

export type RuleSetting = RuleAction | 'off'

export interface SurfacePolicy {
  rules: Record<RuleId, RuleSetting>
  /** Check URL fields and URLs embedded in text against the trusted-domain list. */
  checkUrls: boolean
}

/**
 * Per-surface rule policy. Every surface currently shares the approved
 * defaults: profanity flags for review, harassment and sexual content are
 * rejected, untrusted links flag for review. A future student task
 * submission surface (submissions carry no text today) would set
 * url-restriction to 'reject'.
 */
const DEFAULT_POLICY: SurfacePolicy = {
  rules: {
    profanity: 'flag',
    harassment: 'reject',
    sexual: 'reject',
    'url-restriction': 'flag',
  },
  checkUrls: true,
}

export const SURFACE_POLICY: Record<Surface, SurfacePolicy> = {
  announcement: DEFAULT_POLICY,
  'section-notification': DEFAULT_POLICY,
  task: DEFAULT_POLICY,
  profile: DEFAULT_POLICY,
  'material-link': DEFAULT_POLICY,
}

/** HTTP status for moderation refusals — 4xx, distinct from Zod 400s. */
export const MODERATION_STATUS = 422

/**
 * Trusted link domains (suffix match: exact host or any subdomain).
 * Defaults per the owner decision 2026-10-16: the school's Cloudinary
 * media host plus Google Drive / Docs for materials. The school site
 * domain is not committed here because the production host is env-bound;
 * set MODERATION_TRUSTED_DOMAINS to extend the list (comma-separated),
 * e.g. "aics.edu.ph,youtube.com".
 */
export const DEFAULT_TRUSTED_DOMAINS: string[] = [
  'res.cloudinary.com',
  'drive.google.com',
  'docs.google.com',
]

export function trustedDomains(): string[] {
  const extra = process.env.MODERATION_TRUSTED_DOMAINS
  if (!extra) return DEFAULT_TRUSTED_DOMAINS
  const parsed = extra
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0 && d.includes('.'))
  return Array.from(new Set([...DEFAULT_TRUSTED_DOMAINS, ...parsed]))
}

/**
 * Log allowlist saves (rule 5 engaging) as allow decisions. Every reject
 * and flag is always logged; this toggle only covers the "an allowlisted
 * phrase saved a would-be match" audit rows.
 */
export const ALLOWLIST_LOG = true

/** Decision precedence for the primary rule named in the response. */
export const RULE_PRECEDENCE: RuleId[] = ['sexual', 'harassment', 'url-restriction', 'profanity']

export const MESSAGES: Record<RuleId, Record<RuleAction, string>> = {
  profanity: {
    flag:
      'Your content was held for review because it contains language an administrator needs to approve. Please rephrase it, or contact the administrator if you believe this is a mistake.',
    reject:
      'Your content was rejected because it contains profane or abusive language. Please rephrase it.',
  },
  harassment: {
    flag:
      'Your content was held for review because it may contain harassing or discriminatory language.',
    reject:
      'Your content was rejected because it contains harassing or discriminatory language, which is not allowed.',
  },
  sexual: {
    flag:
      'Your content was held for review because it may contain sexually explicit material.',
    reject: 'Your content was rejected because it contains sexually explicit material, which is not allowed.',
  },
  'url-restriction': {
    flag:
      'Links are only accepted from trusted sources such as the school site, Google Drive, and Google Docs. Contact the administrator if you need to share another source.',
    reject: 'External links are not allowed in this submission.',
  },
}
