// Moderation decision logic — pure, no HTTP or database imports.
//
// Takes the findings from the engine plus the URL findings from the
// url-policy, applies the per-surface rule policy, and returns the
// decision: which rule is primary, which action applies, and the message
// the client sees. Kept separate from index.ts so the verification
// corpus can exercise the exact decision logic without booting Next.js.

import { MESSAGES, RULE_PRECEDENCE, SURFACE_POLICY, type RuleAction, type RuleId, type Surface } from './config'
import { isContextualTerm, type TextFinding } from './engine'

export interface UrlFinding {
  field: string
  url: string
  host: string
  trusted: boolean
}

export type ModerationAction = RuleAction | 'allow'

export interface ModerationDecision {
  action: ModerationAction
  /** Primary rule that fired; 'allowlist' when rule 5 saved the text; null on a clean pass. */
  ruleId: RuleId | 'allowlist' | null
  /** Client-facing message for reject/flag decisions; null otherwise. */
  message: string | null
  /** Text matches from the fired rules (policy-off rules excluded). */
  findings: TextFinding[]
  /** Untrusted URL matches when URL checking is on for the surface. */
  urlFindings: UrlFinding[]
  /** Allowlist terms that saved a would-be match (present on allow decisions only). */
  allowlistSaves: string[]
}

export function decide(
  surface: Surface,
  findings: TextFinding[],
  urlFindings: UrlFinding[],
  allowlistSaves: string[]
): ModerationDecision {
  const policy = SURFACE_POLICY[surface]
  const active = findings.filter((f) => policy.rules[f.ruleId] !== 'off')
  const untrustedUrls = policy.checkUrls ? urlFindings.filter((u) => !u.trusted) : []

  if (active.length === 0 && untrustedUrls.length === 0) {
    if (allowlistSaves.length > 0) {
      return {
        action: 'allow',
        ruleId: 'allowlist',
        message: null,
        findings,
        urlFindings,
        allowlistSaves,
      }
    }
    return { action: 'allow', ruleId: null, message: null, findings: [], urlFindings: [], allowlistSaves: [] }
  }

  // Contextual review path (reviewer verdict 2026-10-16): a finding whose
  // canonical term is contextual (clinical anatomy, folk-tale / literary
  // registers) never rejects on its own — it contributes flag-for-review, so
  // a biology lesson or a Nognog storybook post is held for an admin instead
  // of refused. Any clear-case finding on the same rule still rejects, and a
  // clear case on ANY rejecting rule rejects the whole write.
  const rejecting = new Set<RuleId>()
  for (const finding of active) {
    if (policy.rules[finding.ruleId] === 'reject' && !isContextualTerm(finding.canonical)) {
      rejecting.add(finding.ruleId)
    }
  }
  if (untrustedUrls.length > 0 && policy.rules['url-restriction'] === 'reject') {
    rejecting.add('url-restriction')
  }

  const action: RuleAction = rejecting.size > 0 ? 'reject' : 'flag'

  // Primary rule: when something rejects, name the highest-precedence rule
  // that is actually rejecting (so a mixed contextual-sexual + clear-
  // harassment text is refused as harassment, not mislabeled sexual).
  // When nothing rejects, the highest-precedence fired rule carries the
  // hedged "held for review" message.
  const fired = new Set<RuleId>(active.map((f) => f.ruleId))
  if (untrustedUrls.length > 0) fired.add('url-restriction')
  const pool: Set<RuleId> = rejecting.size > 0 ? rejecting : fired
  let ruleId: RuleId = 'profanity'
  for (const candidate of RULE_PRECEDENCE) {
    if (pool.has(candidate)) {
      ruleId = candidate
      break
    }
  }

  return {
    action,
    ruleId,
    message: MESSAGES[ruleId][action],
    findings: active,
    urlFindings: untrustedUrls,
    allowlistSaves: [],
  }
}
