// Filipino moderation dataset — curated for the AICS school corpus.
//
// Attribution (required):
//   - Seed data from jromest/filipino-badwords-list (MIT) —
//     https://github.com/jromest/filipino-badwords-list
//   - Seed data from Shutterstock LDNOOBW, fil directory (CC-BY-4.0) —
//     https://github.com/shutterstock/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
//     Original list licensed under CC-BY-4.0; reuse requires attribution.
//   - Curation, category tags, inflected variants, and additions by the
//     portal team (2026-10-16). STATUS: pending sign-off by a
//     Filipino-speaking reviewer (see docs/moderation-library-vetting.md
//     section 7 — the single highest-leverage owner contribution).
//
// Categories (map to the five rule sets):
//   1 = profanity / abusive language  (flag for review)
//   2 = harassment / discriminatory   (reject)
//   3 = sexual content                (reject)
//
// Every entry is matched with word boundaries (see engine.ts), so a term
// only fires as a standalone word, never inside a longer legitimate word.
// Tagalog morphology is handled with explicit inflected and ligature
// variants per entry — a naive word-boundary list would miss most
// real-world usage (gago -> ginago, nakakagago, kagaguhan), while plain
// substring matching would explode false positives.
//
// REMOVED from the seed lists because they collide with legitimate school
// vocabulary (each was read in the raw list before deciding — see the
// vetting doc section 3.1):
//   boto (vote / civic vocabulary), brocha (paintbrush, art class),
//   gaga (nickname; Lady Gaga), kiki (nickname), inutil (ordinary
//   adjective used in formal writing), hudas (Judas; also a surname),
//   lintik (lightning — science class; mild), olok (naglolok = joking),
//   poke (English "poke"), poki (brand name), puke (English "puke" =
//   vomit — common school word), puking (English present tense of puke),
//   suso / susu (suso = snail, biology; nursing), lechugas (lettuce —
//   markets / nutrition), hinampak (ordinary verb "was hit"), bogo (Bogo
//   City), inutel, kagang, kaululan, ratbu, tinil, tungaw (meanings
//   unverified — kept out rather than guessed).
//   nimal (jromest seed entry; meaning unverified, plausibly an evasion
//   truncation of "animal" — KEEP-OUT recorded 2026-10-16 per reviewer
//   verdict; revisit only if a native speaker provides a reading).
//   kayat (REMOVED 2026-10-16 per reviewer verdict, high-priority item A:
//   "kayat" = "want" in Ilocano, so ordinary Ilocano sentences would be
//   unconditionally rejected as sexual content. The vulgar Ilocano verb
//   can return — behind the contextual review path or with a verified
//   reading — once an Ilocano-speaking reviewer signs off; see
//   docs/moderation-filipino-review.md revision 2.)
// Habal is kept (vulgar) WITH the allowlist carrying "habal-habal" (the
// legitimate provincial motorcycle transport). Leche is kept WITH the
// allowlist carrying "leche flan" (cafeteria / fundraiser vocabulary).
//
// CONTEXTUAL ENTRIES (reviewer verdict 2026-10-16, recommendation B):
//   nognog, pokpok, unano are tagged contextual — matches flag for admin
//   review instead of rejecting outright, because each collides with
//   legitimate school registers (folk-tale character, drum onomatopoeia
//   in music materials, "Unano at Higante"-style storybooks). A clear
//   case in the same text still rejects; see policy.ts decide().

export type ModerationCategory = 1 | 2 | 3

export interface FilipinoEntry {
  /** Canonical term, matched on word boundaries. */
  term: string
  category: ModerationCategory
  /** Inflected / ligature / spelling variants, each matched on word boundaries too. */
  variants?: string[]
  /**
   * Contextual (reviewer verdict 2026-10-16): the term collides with a
   * legitimate school register (folk tales, music, literature), so its
   * matches are held for admin review (flag) instead of rejected. A
   * clear-case term in the same text still rejects — see policy.ts.
   */
  contextual?: boolean
}

export const FILIPINO_ENTRIES: FilipinoEntry[] = [
  // ---- Category 1: profanity and abusive language ----
  {
    term: 'gago',
    category: 1,
    variants: ['ginago', 'nagago', 'nakakagago', 'kagaguhan', 'gagong'],
  },
  { term: 'gagi', category: 1 },
  { term: 'ogag', category: 1 },
  {
    term: 'bobo',
    category: 1,
    variants: ['nakakabobo', 'kabobohan', 'bobong'],
  },
  { term: 'tanga', category: 1, variants: ['katangahan', 'tangahan', 'tangang'] },
  { term: 'engot', category: 1 },
  { term: 'ulol', category: 1, variants: ['ulul'] },
  { term: 'ungas', category: 1 },
  { term: 'timang', category: 1 },
  { term: 'tarantado', category: 1 },
  { term: 'shunga', category: 1 },
  { term: 'buang', category: 1, variants: ['buwang'] },
  { term: 'kupal', category: 1 },
  { term: 'sira ulo', category: 1, variants: ['siraulo'] },
  { term: 'tae', category: 1 },
  { term: 'amputa', category: 1 },
  { term: 'bwesit', category: 1, variants: ['bwisit', 'bwiset'] },
  { term: 'leche', category: 1, variants: ['leching'] },
  { term: 'punyeta', category: 1, variants: ['punyetang'] },
  { term: 'puta', category: 1, variants: ['puta ka', 'putang'] },
  { term: 'putang ina', category: 1, variants: ['putangina', 'putanginang', 'putanginamo'] },
  { term: 'anak ka ng puta', category: 1 },
  { term: 'tangina', category: 1, variants: ['tanginang', 'taena', 'kingina'] },
  { term: 'pukinangina', category: 1 },
  { term: 'pucha', category: 1, variants: ['puchanggala', 'puchangina'] },
  { term: 'putaragis', category: 1, variants: ['putragis', 'taragis'] },
  { term: 'pakyu', category: 1 },
  { term: 'pakshet', category: 1, variants: ['pakingshet'] },
  { term: 'poyet', category: 1, variants: ['puyet'] },
  { term: 'inamo', category: 1 },
  { term: 'walang hiya', category: 1, variants: ['walanghiya'] },
  { term: 'nakakaburat', category: 1 },
  { term: 'pesteng yawa', category: 1 },

  // ---- Category 2: harassment and discriminatory language ----
  { term: 'animal ka', category: 2 },
  { term: 'hayop ka', category: 2, variants: ['hayup'] },
  { term: 'demonyo ka', category: 2 },
  { term: 'hinayupak', category: 2 },
  { term: 'nognog', category: 2, contextual: true },
  { term: 'pokpok', category: 2, contextual: true },
  { term: 'tsekwa', category: 2, variants: ['chekwa'] },
  { term: 'unano', category: 2, contextual: true },

  // ---- Category 3: sexual content ----
  { term: 'kantot', category: 3, variants: ['kinantot', 'kantotan', 'kantut', 'kantutan', 'nagkantutan'] },
  { term: 'hindot', category: 3, variants: ['hinindot', 'hindutan'] },
  { term: 'iyot', category: 3, variants: ['iniyot'] },
  { term: 'jakol', category: 3, variants: ['nagjakol', 'nagjajakol'] },
  { term: 'burat', category: 3 },
  { term: 'bilat', category: 3 },
  { term: 'bayag', category: 3 },
  { term: 'tamod', category: 3 },
  { term: 'titi', category: 3, variants: ['tite', 'tete', 'teti', 'etits'] },
  { term: 'puki', category: 3, variants: ['pukeng', 'pepek', 'kikinginamo'] },
  { term: 'habal', category: 3 },
  { term: 'binibrocha', category: 3 },
]
