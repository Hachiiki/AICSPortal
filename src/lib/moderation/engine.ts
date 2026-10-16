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
// Each category also gets a "glue" matcher: the same vocabulary, but with
// a transformer chain that strips non-alphabetic characters (spaces, dots,
// dashes) after leet-speak resolution. The two matchers are complementary:
// with spaces preserved, "fuck you" matches the word-boundary patterns;
// with spaces stripped, "f u c k" and "f.u.c.k" collapse to "fuck" and
// match too.
//
// The glue dataset is NOT a copy of the plain dataset: gluing removes every
// separator, so built-in patterns designed for space-preserved text can
// match across word junctions — "data analysis" glues to "datanalysis"
// (contains "tanal"), "ang gatas" glues to "anggatas" (contains "ngga").
// glueSafe() filters those junction-colliding patterns out of the glue
// dataset; the plain matcher keeps them all, where they only fire on text
// the user actually wrote that way. Our own entries additionally gain
// "despaced" variants ("putang ina" also matches the glued "putangina")
// so multi-word terms survive stripping.

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
import { CONTEXTUAL_ENGLISH, ENGLISH_ADDITIONS, classifyEnglish } from './datasets/english'
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
 * "f u uck" collapses to "fuck"). The collapse thresholds copy the
 * library's recommended config (double letters like "ss" in "assess"
 * survive) so built-in whitelists such as "assem"/"assess" stay aligned
 * with the whitelisted text.
 */
const GLUE_BLACKLIST_TRANSFORMERS = [
  resolveConfusablesTransformer(),
  resolveLeetSpeakTransformer(),
  toAsciiLowerCaseTransformer(),
  skipNonAlphabeticTransformer(),
  collapseDuplicatesTransformer({
    defaultThreshold: 1,
    customThresholds: new Map([
      ['b', 2], // a_bb_o
      ['e', 2], // ab_ee_d
      ['o', 2], // b_oo_nga
      ['l', 2], // fe_ll_atio
      ['s', 2], // a_ss_
      ['g', 2], // ni_gg_er
    ]),
  }),
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

/** A built-in englishDataset phrase, flattened for reconstruction. */
interface BuiltInPhrase {
  word: string
  patterns: ParsedPattern[]
  whitelistedTerms: string[]
}

let builtInPhraseCache: BuiltInPhrase[] | null = null

/** Enumerate the built-in English phrases once (patterns + whitelists + word). */
function builtInPhrases(): BuiltInPhrase[] {
  if (builtInPhraseCache) return builtInPhraseCache
  const collected: BuiltInPhrase[] = []
  new DataSet<PhraseMeta>()
    // Cast: englishDataset's metadata is { originalWord }; ours widens it —
    // runtime-compatible shapes.
    .addAll(englishDataset as unknown as DataSet<PhraseMeta>)
    .removePhrasesIf((phrase) => {
      const word = phrase.metadata?.originalWord
      if (typeof word === 'string') {
        collected.push({
          word,
          patterns: [...phrase.patterns],
          whitelistedTerms: [...phrase.whitelistedTerms],
        })
      }
      return false // collect only; remove nothing
    })
  builtInPhraseCache = collected
  return collected
}

/**
 * Keep a pattern in the GLUE dataset? Gluing removes every separator, so the
 * whole text becomes one run and patterns can match across word junctions
 * ("ang gatas" -> "anggatas"). Whitelist suppression needs the match span
 * inside a whitelisted term's span, so junction matches wider than any
 * whitelist term are unsuppressible — those patterns must not run under glue:
 *
 * - start-anchored patterns only fire at the text start, where the known
 *   clean-prefix collisions ("Analyst", "An alibi", "Assessment") are covered
 *   by the built-in whitelists carried into the glue dataset;
 * - single-literal base forms ("anus", "shit|") stay: their junction
 *   collisions are exactly the ones the library whitelists anticipate
 *   ("an us" saves "ran us", "sh it" saves "wash it", "fick" saves
 *   "trafficker");
 * - patterns with an optional WILDCARD ("f[?]ck") stay: no English or
 *   Filipino word starts with their post-wildcard skeleton ("ck", "ndjob"),
 *   so they cannot span a junction — and they are what catches mid-sentence
 *   separator-hidden terms ("what the f u c k");
 * - other multi-node patterns (optional literals like "n[i]gga", "s[s]lut",
 *   "tanal") are dropped unless their mandatory skeleton is >= 6 letters:
 *   short skeletons collide with junctions ("ng gatas" contains "ngga",
 *   "mas lutong" contains "slut", "data analysis" contains "tanal").
 *
 * The plain matcher keeps every pattern — with spaces preserved they can
 * only fire on text the user actually wrote that way.
 */
function glueSafe(pattern: ParsedPattern, base: string): boolean {
  if (pattern.requireWordBoundaryAtStart) return true
  const nodes = pattern.nodes as unknown as Array<Record<string, unknown>>
  if (nodes.length === 1 && nodes[0].chars !== undefined) {
    const literal = (nodes[0].chars as number[]).map((c) => String.fromCodePoint(c)).join('')
    return literal === base
  }
  let skeleton = ''
  let hasOptionalWildcard = false
  for (const node of nodes) {
    if (node.chars !== undefined) {
      skeleton += (node.chars as number[]).map((c) => String.fromCodePoint(c)).join('')
    } else if (node.childNode !== undefined) {
      const inner = node.childNode as Record<string, unknown>
      if (inner.chars === undefined) hasOptionalWildcard = true // optional wildcard [?]
    }
    // bare wildcards contribute nothing to the skeleton
  }
  if (hasOptionalWildcard) return true
  return skeleton.length >= 6
}

function buildDataset(categories: ModerationCategory[]): DataSet<PhraseMeta> {
  const wanted = new Set(categories)
  const ds = new DataSet<PhraseMeta>()
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

/**
 * Dataset for the glue matchers: built-in phrases rebuilt pattern-by-pattern
 * with the left-extended evasion family filtered out, plus our entries with
 * despaced variants so multi-word terms ("putang ina") still match when the
 * separators hiding them are stripped ("p u t a n g i n a" -> "putangina").
 */
function buildGlueDataset(categories: ModerationCategory[]): DataSet<PhraseMeta> {
  const wanted = new Set(categories)
  const ds = new DataSet<PhraseMeta>()
  for (const { word, patterns, whitelistedTerms } of builtInPhrases()) {
    const category = classifyEnglish(word)
    if (category === 0 || !wanted.has(category)) continue
    const kept = patterns.filter((p) => glueSafe(p, word))
    if (kept.length === 0) continue
    ds.addPhrase((phrase) => {
      for (const p of kept) phrase.addPattern(p)
      for (const t of whitelistedTerms) phrase.addWhitelistedTerm(t)
      return phrase.setMetadata({ originalWord: word })
    })
  }
  const addEntry = (term: string, category: ModerationCategory, variants?: string[]) => {
    if (!wanted.has(category)) return
    const forms = new Set<string>()
    for (const word of [term, ...(variants ?? [])]) {
      forms.add(word)
      const despaced = word.replace(/[^a-zA-Z]/g, '')
      if (despaced && despaced !== word) forms.add(despaced)
    }
    ds.addPhrase((phrase) => {
      for (const word of forms) {
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
    const glueBuilt = buildGlueDataset([cat]).build()
    const glueMatcher = new RegExpMatcher({
      blacklistedTerms: glueBuilt.blacklistedTerms,
      whitelistedTerms: [...(glueBuilt.whitelistedTerms ?? []), ...GLOBAL_ALLOWLIST],
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

/**
 * Canonical terms whose matches flag for review instead of rejecting —
 * the contextual review path (reviewer verdict 2026-10-16, recommendations
 * B and D). Union of the Filipino contextual entries (folk-tale / music /
 * literary registers) and the English clinical-anatomy set. The canonical
 * term is stable across the plain and glue matchers, so one lookup covers
 * both. See policy.ts decide() for how this downgrades the action.
 */
const CONTEXTUAL_TERMS = new Set<string>([
  ...FILIPINO_ENTRIES.filter((e) => e.contextual).map((e) => e.term),
  ...CONTEXTUAL_ENGLISH,
])

export function isContextualTerm(canonical: string): boolean {
  return CONTEXTUAL_TERMS.has(canonical)
}
