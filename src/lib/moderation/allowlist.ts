// Moderation allowlist — rule 5, the false-positive guard.
//
// A whitelisted term suppresses any blacklist match inside its span, so
// "magna cum laude" never fires on "cum", and "habal-habal" never fires
// on "habal". Word-boundary patterns already protect most legitimate
// words (bass, cockpit, analysis, title, grape, Essex) — those need no
// allowlist entry and appear in the verification corpus instead.
//
// Every entry below is drawn from vocabulary a school portal genuinely
// writes (honors lists, cafeteria menus, transport guides, health class,
// canteen menus, music and literature electives).

export const GLOBAL_ALLOWLIST: string[] = [
  // Academic honors — every dean's-lister announcement.
  'cum laude',
  // Cafeteria / fundraiser staple; "leche" alone is the curse.
  'leche flan',
  // Provincial motorcycle transport; "habal" alone is the vulgar term.
  'habal-habal',
  // Health / biology curriculum phrases; "sex" alone is category 3.
  'sex education',
  'sex ed',
  // Cafeteria menu item; obscenity's own documented near-miss.
  'shiitake',
  // Music appreciation (jazz history); "scat" alone is category 3.
  'scat singing',
  // French borrowing in formal announcements; "tete" alone is Filipino vulgar.
  'tete-a-tete',
  // Chemistry / safety vocabulary; "retard" alone is the category-2 slur.
  'retardant',
  // Biology (fish anatomy); "anal" alone is category 3 — added with the
  // contextual review path (reviewer verdict 2026-10-16, recommendation D).
  'anal fin',
]
