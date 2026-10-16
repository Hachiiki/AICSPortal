// Moderation engine — obscenity matchers built from our curated datasets.
//
// One RegExpMatcher per rule category (1 profanity, 2 harassment,
// 3 sexual), so the fired rule is inherent to the matcher that matched —
// no post-hoc classification step. Each matcher inherits the recommended
// transformers: leet-speak resolution ($ -> s), Unicode homoglyph
// resolution, duplicate-character collapse ("fuuuuck"), non-alphabetic
// skipping ("f.u.c.k"), and ASCII case folding. Filipino uses the Latin
// alphabet, so the same transformers apply.
//
// A fourth matcher (the detector) carries the union of all blacklisted
// terms WITHOUT the global allowlist. It exists only to detect rule-5
// saves: if the detector matches but the category matchers do not, an
// allowlisted phrase suppressed a would-be match, and that decision is
// worth an audit row.
//
// Each category also gets a "glue" matcher: the same blacklisted terms,
// but with a transformer chain that strips non-alphabetic characters
// (spaces, dots, dashes) after leet-speak resolution. The two matchers
// are complementary: with spaces preserved, "fuck you" matches the
// word-boundary patterns; with spaces stripped, "f u c k" and "f.u.c.k"
// collapse to "fuck" and match too. Word-boundary safety survives the
// stripping, because a boundary still requires a non-word character on
// each side of the term inside the glued run — "bass guitar" glued to
// "bassguitar" still protects "ass". Multi-word allowlist entries are
// self-protecting under glue: "cum laude" glued to "cumlaude" can no
// longer match "cum" on a word boundary.

import {
  DataSet,
  RegExpMatcher,
  collapseDuplicatesTransformer,
  englishDataset,
  englishRecommendedTransformers,
  englishRecommendedWhitelistMatcherTransformers,
  parseRawPattern,
  resolveConfusablesTransformer,
  resolveLeetSpeakTransformer,
  skipNonAlphabeticTransformer,
  toAsciiLowerCaseTransformer,
} from 'obscenity'
import type { ParsedPattern } from 'obscenity'
import { ENGLISH_ADDITIONS, classifyEnglish } from './datasets/english'
import { FILIPINO_ENTRIES, type ModerationCategory } from './datasets/filipino'
import { GLOBAL_ALLOWLIST } from './allowlist'
import type { RuleId } from './config'

/** Phrase metadata shape: ours ("original") or the built-in English set ("originalWord"). */
interface PhraseMeta {
  original?: string
  originalWord?: string
}

const CATEGORY_RULES: { cat: ModerationCategory; ruleId: RuleId }[] = [
  { cat: 1, ruleId: 'profanity' },
  { cat: 2, ruleId: 'harassment' },
  { cat: 3, ruleId: 'sexual' },
]

/**
 * Transformer chain for the glue matchers: separators are stripped only
 * AFTER confusable and leet-speak resolution (so "4" resolves to "a"
 * instead of being dropped), and BEFORE duplicate collapsing (so
 * "f u uck" collapses to "fuck").
 */
const GLUE_BLACKLIST_TRANSFORMERS = [
  resolveConfusablesTransformer(),
  resolveLeetSpeakTransformer(),
  toAsciiLowerCaseTransformer(),
  skipNonAlphabeticTransformer(),
  collapseDuplicatesTransformer(),
]

/** Word-boundary pattern: the term only matches as a standalone word. */
function wordPattern(word: string): ParsedPattern | null {
  try {
    return parseRawPattern(`|${word}|`)
  } catch (err) {
    // A curated term containing pattern meta-characters must never crash
    // a cold start; skip it loudly instead.
    console.error(`[moderation] unparseable pattern for term "${word}":`, err)
    return null
  }
}

function buildDataset(categories: ModerationCategory[]): DataSet<PhraseMeta> {
  const wanted = new Set(categories)
  const ds = new DataSet<PhraseMeta>()
    // Cast: englishDataset's metadata is { originalWord }; ours widens it
    // to { original?, originalWord? } — runtime-compatible shapes.
    .addAll(englishDataset as unknown as DataSet<PhraseMeta>)
    .removePhrasesIf((phrase) => {
      const word = phrase.metadata?.originalWord
      if (word === undefined) return false // unclassified built-ins stay in category 1
      const category = classifyEnglish(word)
      return category === 0 || !wanted.has(category)
    })
  const addEntry = (term: string, category: ModerationCategory, variants?: string[]) => {
    if (!wanted.has(category)) return
    ds.addPhrase((phrase) => {
      for (const word of [term, ...(variants ?? [])]) {
        const parsed = wordPattern(word)
        if (parsed) phrase.addPattern(parsed)
      }
      return phrase.setMetadata({ original: term })
    })
  }
  for (const entry of ENGLISH_ADDITIONS) addEntry(entry.term, entry.category, entry.variants)
  for (const entry of FILIPINO_ENTRIES) addEntry(entry.term, entry.category, entry.variants)
  return ds
}

interface CategoryMatcher {
  ruleId: RuleId
  dataset: DataSet<PhraseMeta>
  matcher: RegExpMatcher
  glueMatcher: RegExpMatcher
}

interface Engine {
  categories: CategoryMatcher[]
  detector: RegExpMatcher
}

let engineCache: Engine | null = null

function getEngine(): Engine {
  if (engineCache) return engineCache
  const categories: CategoryMatcher[] = CATEGORY_RULES.map(({ cat, ruleId }) => {
    const dataset = buildDataset([cat])
    const built = dataset.build()
    const whitelistedTerms = [...(built.whitelistedTerms ?? []), ...GLOBAL_ALLOWLIST]
    const matcher = new RegExpMatcher({
      blacklistedTerms: built.blacklistedTerms,
      whitelistedTerms,
      ...englishRecommendedTransformers,
    })
    const glueMatcher = new RegExpMatcher({
      blacklistedTerms: built.blacklistedTerms,
      whitelistedTerms,
      blacklistMatcherTransformers: GLUE_BLACKLIST_TRANSFORMERS,
      whitelistMatcherTransformers: englishRecommendedWhitelistMatcherTransformers,
    })
    return { ruleId, dataset, matcher, glueMatcher }
  })
  const detectorDataset = buildDataset([1, 2, 3])
  const detector = new RegExpMatcher({
    ...detectorDataset.build(),
    ...englishRecommendedTransformers,
  })
  engineCache = { categories, detector }
  return engineCache
}

export interface TextFinding {
  /** Which input field the match came from ("title", "body", ...). */
  field: string
  ruleId: RuleId
  /** Canonical dataset term for the phrase that matched. */
  canonical: string
  /** The actual matched text, sliced from the original input. */
  matchedText: string
}

export interface FieldScan {
  findings: TextFinding[]
  /** Allowlist terms that suppressed would-be matches in this text (rule 5). */
  allowlistSaves: string[]
}

/** Scan one text field with all three category matchers (plain + glue). */
export function scanText(field: string, text: string): FieldScan {
  const { categories, detector } = getEngine()
  const findings: TextFinding[] = []
  const seen = new Set<string>()
  for (const { ruleId, dataset, matcher, glueMatcher } of categories) {
    for (const matcherInstance of [matcher, glueMatcher]) {
      const matches = matcherInstance.getAllMatches(text)
      for (const match of matches) {
        const meta = dataset.getPayloadWithPhraseMetadata(match).phraseMetadata
        const canonical = meta?.original ?? meta?.originalWord
        const term = canonical ?? 'unknown-term'
        const key = `${ruleId}:${term}`
        if (seen.has(key)) continue // same word caught by both matchers
        seen.add(key)
        findings.push({
          field,
          ruleId,
          canonical: term,
          matchedText: text.slice(match.startIndex, match.endIndex + 1),
        })
      }
    }
  }
  const allowlistSaves: string[] = []
  if (findings.length === 0 && detector.hasMatch(text)) {
    // Something would have matched without the allowlist; find which
    // allowlisted phrase did the saving so the audit row names it.
    const lower = text.toLowerCase()
    for (const term of GLOBAL_ALLOWLIST) {
      if (lower.includes(term.toLowerCase()) && detector.hasMatch(term)) {
        allowlistSaves.push(term)
      }
    }
  }
  return { findings, allowlistSaves }
}

/** Exposed for tests and diagnostics: the allowlist in effect. */
export function activeAllowlist(): string[] {
  return GLOBAL_ALLOWLIST
}
