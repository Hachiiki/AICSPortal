// URL policy — rule 4, website and link restrictions.
//
// Extracts http(s) and www. URLs from free text and classifies explicit
// URL fields. A host is trusted when it equals a trusted domain or is a
// subdomain of one (suffix match on dot boundaries), so
// "res.cloudinary.com" also trusts nothing above it, while
// "drive.google.com" trusts "foo.drive.google.com" too.
//
// v1 scope: scheme-bearing URLs (https://, http://) and www.-prefixed
// hosts. Bare-domain detection ("visit example.com") is deliberately
// left out — without a scheme, dotted tokens collide with filenames,
// abbreviations, and decimals often enough to be a false-positive
// factory rather than a policy.

import { trustedDomains } from './config'
import type { UrlFinding } from './policy'

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'`)\]}]+/gi

/** Strip sentence punctuation that rides along with a URL in prose. */
function trimTrailingPunctuation(url: string): string {
  return url.replace(/[.,;:!?]+$/, '')
}

function normalize(raw: string): string {
  if (raw.toLowerCase().startsWith('www.')) return `https://${raw}`
  return raw
}

export interface ClassifiedUrl {
  url: string
  host: string
  trusted: boolean
}

/** Classify one URL string; null when it does not parse. */
export function classifyUrl(raw: string): ClassifiedUrl | null {
  const candidate = trimTrailingPunctuation(raw.trim())
  if (!candidate) return null
  let parsed: URL
  try {
    parsed = new URL(normalize(candidate))
  } catch {
    return null
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  const host = parsed.hostname.toLowerCase()
  return { url: parsed.toString(), host, trusted: isTrustedHost(host) }
}

export function isTrustedHost(host: string): boolean {
  for (const domain of trustedDomains()) {
    if (host === domain || host.endsWith(`.${domain}`)) return true
  }
  return false
}

/** Find every URL in a text field and classify each. */
export function extractUrlFindings(field: string, text: string): UrlFinding[] {
  const findings: UrlFinding[] = []
  const matches = text.match(URL_PATTERN)
  if (!matches) return findings
  for (const raw of matches) {
    const classified = classifyUrl(raw)
    if (classified) {
      findings.push({ field, ...classified })
    }
  }
  return findings
}

/** Classify an explicit URL field (material link, profile photo URL). */
export function urlFieldFinding(field: string, raw: string): UrlFinding | null {
  const classified = classifyUrl(raw)
  return classified ? { field, ...classified } : null
}
