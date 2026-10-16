// English moderation dataset — classification of obscenity's built-in
// englishDataset (MIT, data originally from the cuss project) plus our
// additions for compounds and slurs it does not carry.
//
// The englishDataset ships one flat profanity list; we split it across
// our three categories so the fired rule is inherent to the matcher that
// matched. englishDataset's own hand-written pattern variants (evasion
// forms) are inherited wholesale — we only filter by word.
//
// REMOVED from the built-in list (false-positive traps in a school
// corpus):
//   abo — Tagalog for ash ("abo ng bulkan", volcanic ash) — guaranteed
//         science-class vocabulary; the built-in entry is an anti-
//         Aboriginal slur, which is not the reading a PH portal sees.
//
// Word-boundary safety (verified in the corpus test): ass, cock, sex,
// anal, tit, rape do not fire inside bass, cockpit, Essex, analysis,
// title, grape — the boundary assertion in the pattern engine handles
// the classic Scunthorpe family. The allowlist (allowlist.ts) covers the
// remaining multi-word traps: cum laude, sex education, shiitake,
// scat singing, tete-a-tete.

import type { ModerationCategory } from './filipino'

/** Words from obscenity's englishDataset mapped to our rule categories. */
export const ENGLISH_CLASSIFICATION: Record<string, ModerationCategory> = {
  // Category 1 — profanity / abusive language
  arse: 1,
  ass: 1,
  bastard: 1,
  bitch: 1,
  bollocks: 1,
  cuck: 1,
  cunt: 1,
  dick: 1,
  fuck: 1,
  piss: 1,
  prick: 1,
  shit: 1,
  turd: 1,
  twat: 1,
  wank: 1,

  // Category 2 — harassment / discriminatory language
  abeed: 2,
  africoon: 2,
  arabush: 2,
  boonga: 2,
  chingchong: 2,
  chink: 2,
  dyke: 2,
  fag: 2,
  kike: 2,
  negro: 2,
  nigger: 2,
  retard: 2,
  slut: 2,
  spastic: 2,
  tranny: 2,
  whore: 2,

  // Category 3 — sexual content
  anal: 3,
  anus: 3,
  bestiality: 3,
  blowjob: 3,
  boob: 3,
  buttplug: 3,
  cock: 3,
  cum: 3,
  deepthroat: 3,
  dildo: 3,
  doggystyle: 3,
  'double penetration': 3,
  ejaculate: 3,
  fellatio: 3,
  felch: 3,
  'finger bang': 3,
  fisting: 3,
  gangbang: 3,
  handjob: 3,
  hentai: 3,
  hooker: 3,
  incest: 3,
  'jerk off': 3,
  jizz: 3,
  lubejob: 3,
  masturbate: 3,
  orgasm: 3,
  orgy: 3,
  penis: 3,
  porn: 3,
  pussy: 3,
  rape: 3,
  scat: 3,
  semen: 3,
  sex: 3,
  tit: 3,
  vagina: 3,
}

/** Built-in words we refuse to carry, with the reason kept in one place. */
export const REMOVED_ENGLISH = new Set(['abo'])

/**
 * Classify a built-in englishDataset word. Anything not mapped defaults
 * to category 1 (the least severe action), so future upstream additions
 * fail safe rather than silently over-blocking.
 */
export function classifyEnglish(word: string): ModerationCategory {
  if (REMOVED_ENGLISH.has(word)) return 0
  return ENGLISH_CLASSIFICATION[word] ?? 1
}

export interface EnglishAddition {
  term: string
  category: ModerationCategory
  variants?: string[]
  note?: string
}

/**
 * Additions beyond the built-in dataset:
 * - compounds the built-in word-boundary patterns miss (motherfucker,
 *   asshole, bullshit — "fuck"/"ass" alone never fire inside them);
 * - harassment terms the built-in list does not carry.
 * Deliberately NOT added, to avoid school-corpus false positives:
 *   jap (abbreviation of Japanese in ordinary use), paki (Tagalog
 *   "paki-" prefix: paki-print, paki-abot), hoe (garden tool).
 */
export const ENGLISH_ADDITIONS: EnglishAddition[] = [
  // Category 1 — compounds of built-in profanity. "fuckyou" is the
  // glued form of "f u c k you": the skip-non-alphabetic transformer
  // strips the spaces, so the word boundary lands after "fuckyou".
  { term: 'motherfucker', category: 1, variants: ['motherfucking'] },
  { term: 'fucker', category: 1, variants: ['fucking', 'fucked', 'fuckyou'] },
  { term: 'bullshit', category: 1 },
  { term: 'shithead', category: 1 },
  { term: 'asshole', category: 1 },
  { term: 'dumbass', category: 1 },

  // Category 2 — harassment / discriminatory additions
  { term: 'coon', category: 2 },
  { term: 'gook', category: 2 },
  { term: 'wetback', category: 2 },
  { term: 'spic', category: 2 },
  { term: 'towelhead', category: 2 },
]
