// Content moderation — the module every write route calls.
//
// Usage, next to the existing Zod validation (src/lib/validation.ts):
//
//   const verdict = await moderateContent({
//     surface: 'announcement',
//     fields: { title, body },
//     actor: { username: session.username, role: session.role, branch },
//   })
//   if (!verdict.ok) return verdict.response
//
// Server-side only. The frontend is advisory at most — a crafted direct
// API call can never persist rejected or flagged content, because this
// check runs before every insert and returns a 422 naming the rule.
//
// Decision flow: fields are scanned by the three category matchers
// (engine.ts), URLs are extracted and classified (url-policy.ts), the
// per-surface policy decides reject vs flag vs allow (policy.ts), and
// every outcome-changing decision lands in moderation_logs (log.ts).

import { NextResponse } from 'next/server'
import { ALLOWLIST_LOG, MODERATION_STATUS, SURFACE_POLICY, type Surface } from './config'
import { scanText, type TextFinding } from './engine'
import { decide, type UrlFinding } from './policy'
import { extractUrlFindings, urlFieldFinding } from './url-policy'
import { writeModerationLog } from './log'

export interface ModerateContentInput {
  surface: Surface
  /** Free-text fields to scan, by field name ("title", "body", ...). */
  fields: Record<string, string | undefined | null>
  /** Explicit URL fields (material link, profile photo URL), by field name. */
  urlFields?: Record<string, string | undefined | null>
  actor: {
    username: string
    role: string
    branch: string
  }
}

export interface ModerateContentVerdict {
  ok: boolean
  /** Present only when not ok: the 422 response naming the rule that fired. */
  response?: NextResponse
}

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentVerdict> {
  const { surface, fields, urlFields, actor } = input

  const textEntries = Object.entries(fields).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
  )
  const urlEntries = Object.entries(urlFields ?? {}).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
  )
  if (textEntries.length === 0 && urlEntries.length === 0) return { ok: true }

  // Rules 1-3: category matchers over every text field.
  const findings: TextFinding[] = []
  const allowlistSaves: string[] = []
  for (const [field, text] of textEntries) {
    const scan = scanText(field, text)
    findings.push(...scan.findings)
    allowlistSaves.push(...scan.allowlistSaves)
  }

  // Rule 4: URLs embedded in text plus explicit URL fields.
  const urlFindings: UrlFinding[] = []
  if (SURFACE_POLICY[surface].checkUrls) {
    for (const [field, text] of textEntries) {
      urlFindings.push(...extractUrlFindings(field, text))
    }
    for (const [field, raw] of urlEntries) {
      const finding = urlFieldFinding(field, raw)
      if (finding) urlFindings.push(finding)
    }
  }

  const decision = decide(surface, findings, urlFindings, allowlistSaves)

  if (decision.action === 'allow') {
    if (decision.ruleId === 'allowlist' && ALLOWLIST_LOG) {
      await writeModerationLog({
        branch: actor.branch,
        surface,
        actorUsername: actor.username,
        actorRole: actor.role,
        ruleId: 'allowlist',
        action: 'allow',
        matchedTerms: decision.allowlistSaves,
        reviewPending: false,
        reviewedAt: null,
        reviewedBy: null,
      })
    }
    return { ok: true }
  }

  const matchedTerms = [
    ...new Set(decision.findings.map((f) => f.canonical)),
  ]
  await writeModerationLog({
    branch: actor.branch,
    surface,
    actorUsername: actor.username,
    actorRole: actor.role,
    // decide() pairs every reject/flag decision with a fired rule id;
    // 'unknown' is the never-expected fallback that stays debuggable in
    // the log if that invariant ever breaks.
    ruleId: decision.ruleId ?? 'unknown',
    action: decision.action,
    matchedTerms,
    rejectedUrlCount: decision.urlFindings.length,
    reviewPending: decision.action === 'flag',
    reviewedAt: null,
    reviewedBy: null,
  })

  return {
    ok: false,
    response: NextResponse.json(
      {
        ok: false,
        error: decision.message,
        rule: decision.ruleId,
        action: decision.action,
      },
      { status: MODERATION_STATUS }
    ),
  }
}
