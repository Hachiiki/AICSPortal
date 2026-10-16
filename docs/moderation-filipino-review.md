# Filipino Word-List Reviewer Sign-Off (Content Moderation)

- **Prepared:** 2026-10-16 · **Status:** ready for review — sign-off pending
- **Reviewer:** a Filipino-speaking reviewer appointed by the owner (owner action — decision 2 of docs/moderation-library-vetting.md section 7)
- **Data under review:** `src/lib/moderation/datasets/filipino.ts` as merged on `main` (PR #44) — 54 canonical entries, 51 matched variants, 105 matched strings in total
- **How to mark:** work through the review areas in sections 2–7, check the boxes in section 9 as you finish each area, and write corrections beside the row they concern (or in the notes lines at the end). Return the marked file to the owner — the dataset is then patched to match your verdicts and the TODO item closes.

## 1. What you are reviewing (primer)

The AICS portal moderates every user-authored string that persists to the database — announcements (admin), section notifications (faculty), task text (faculty), materials links (faculty), and profile fields (student). Moderation runs server-side in the API layer, next to the Zod validation, and a crafted direct API call cannot persist flagged content. The engine is the `obscenity` matcher (MIT, the single runtime dependency this epic added) fed by our own curated datasets — one matcher per rule category, so the fired rule is inherent to the match rather than inferred afterwards.

Filipino text is matched by five rule sets working together. Categories 1–3 are word lists (the subject of this sign-off): every entry is matched with word boundaries, so a term only fires as a standalone word and never inside a longer legitimate word. A second "glue" matcher per category additionally catches separator-hidden masking — `g a g o`, `p u t a n g i n a` — by stripping separators, using a junction-safe pattern set so glued legitimate phrases like "ang gatas" or "data analysis" cannot false-positive. Rule 4 is the URL policy (trusted-domain allowlist; not part of this review). Rule 5 is the false-positive guard: allowlisted phrases suppress any match inside their span, which is what keeps `habal-habal`, `leche flan`, and `tete-a-tete` safe while their vulgar roots stay flagged.

The category tag decides what happens to the write, and this is why the tags are the core of your review:

| Category | Rule id | Action | What the author sees |
|---|---|---|---|
| 1 — profanity / abusive language | `profanity` | **flag** | Write refused with a "held for review" message; logged `reviewPending` for admin follow-up |
| 2 — harassment / discriminatory | `harassment` | **reject** | Write refused outright, rule named |
| 3 — sexual content | `sexual` | **reject** | Write refused outright, rule named |

Both actions block persistence; the difference is tone, log priority, and the follow-up workflow. (A mis-tag between 1 and 2 or 3 therefore changes the user experience from "an administrator will talk to you" to "refused" — that is the judgment you are certifying.) Not in scope for this sign-off: the English dataset and its category mapping, the URL trusted-domain list, the engine code itself, and the moderation_logs audit trail — those are recorded in docs/moderation-library-vetting.md.

**Attribution (carried in the dataset file header).** Seed data from jromest/filipino-badwords-list (MIT, 97 entries) and Shutterstock LDNOOBW `fil` (CC-BY-4.0, 14 entries including one duplicate). Category tags, inflected variants, removals, and the five additions are by the portal team, 2026-10-16. Provenance per entry: **jromest** (38 canonical), **LDNOOBW** (4), **both** (7), **added** (5 — buang, inamo, walang hiya, tsekwa, unano). In the variant columns below, **† marks a variant the portal team added** (22 of the 51); unmarked variants were inherited from the seed lists.

## 2. Review area A — Category 1: profanity and abusive language (33 entries)

Action when matched: **flag for review** (write refused, admin follow-up). Glosses are deliberately clinical.

| # | Term | Gloss | Variants also matched | Source | Reviewer notes |
|---|---|---|---|---|---|
| 1 | gago | stupid (masculine-address insult) | ginago†, nagago†, nakakagago†, kagaguhan, gagong† | jromest | |
| 2 | gagi | effeminate variant of gago | — | jromest | |
| 3 | ogag | reversal slang of gago | — | jromest | |
| 4 | bobo | stupid | nakakabobo†, kabobohan†, bobong† | both | |
| 5 | tanga | dense, foolish | katangahan†, tangahan†, tangang† | both | |
| 6 | engot | slow-witted | — | jromest | |
| 7 | ulol | deranged person | ulul | both | |
| 8 | ungas | lout, brute | — | jromest | |
| 9 | timang | scatterbrained, crazy | — | jromest | |
| 10 | tarantado | scoundrel | — | jromest | |
| 11 | shunga | stupid (slang) | — | jromest | |
| 12 | buang | crazy (Visayan) | buwang† | **added** | Visayan reach — confirm |
| 13 | kupal | smegma; strong personal insult | — | jromest | |
| 14 | sira ulo | "broken head," crazy | siraulo | jromest | |
| 15 | tae | feces ("shit") | — | jromest | FLAG: Korean romanization collision — see section 7 item 4 |
| 16 | amputa | contraction of "anak ng puta" | — | jromest | |
| 17 | bwesit | expletive, "damn" (Hokkien-derived) | bwisit, bwiset† | jromest | |
| 18 | leche | lit. "milk"; Spanish-derived expletive | leching | jromest | allowlist carries "leche flan" — section 6 |
| 19 | punyeta | Spanish-derived expletive | punyetang† | jromest | |
| 20 | puta | whore (Spanish) | puta ka, putang | jromest ("puta ka" from LDNOOBW) | |
| 21 | putang ina | "whore mother" — strongest common Tagalog curse | putangina, putanginang†, putanginamo | both | glue matcher also catches spaced/glued forms |
| 22 | anak ka ng puta | "you son of a whore" | — | LDNOOBW | |
| 23 | tangina | contraction of putang ina | tanginang†, taena, kingina | both | LDNOOBW's spaced "tang ina" is covered via glue |
| 24 | pukinangina | variant curse, putang ina family (puki ng ina) | — | jromest | |
| 25 | pucha | euphemism for puta | puchanggala, puchangina | jromest | |
| 26 | putaragis | euphemistic expletive blend | putragis, taragis | jromest | |
| 27 | pakyu | phonetic rendering of "fuck you" | — | jromest | |
| 28 | pakshet | phonetic blend of "fuck" / "shit" | pakingshet | jromest | |
| 29 | poyet | euphemistic expletive, puta family | puyet | jromest | |
| 30 | inamo | "your mother" (accusatory contraction of "ina mo") | — | **added** | |
| 31 | walang hiya | "shameless" — grave insult in PH moral vocabulary | — | **added** | FLAG: appears in values-education discussion — confirm |
| 32 | nakakaburat | "so irritating / disgusting" | — | jromest | |
| 33 | pesteng yawa | "damn devil" (yawa: Visayan for demon) | — | jromest | |

## 3. Review area B — Category 2: harassment and discriminatory language (8 entries)

Action when matched: **reject** — the write is refused outright and the rule is named in the response. These entries are tagged harassment rather than profanity because they dehumanize a person or target a group (protected characteristic, ethnicity, body, or profession), not merely insult an individual's intelligence. That distinction is exactly what needs a native speaker's confirmation: several of these sit on the boundary between a heated insult (category 1, flag) and dehumanizing abuse (category 2, reject), and the tag decides whether the author gets follow-up or a hard refusal.

| # | Term | Gloss | Variants also matched | Source | Reviewer notes |
|---|---|---|---|---|---|
| 34 | animal ka | "you animal" — dehumanizing | — | jromest | |
| 35 | hayop ka | "you beast" — dehumanizing | hayup | jromest | |
| 36 | demonyo ka | "you devil" — dehumanizing | — | jromest | |
| 37 | hinayupak | "beast, monster" — strong dehumanizing insult | — | jromest | |
| 38 | nognog | dark-skinned person — colorist slur | — | LDNOOBW | FLAG: folk-tale registers ("Nognog") — confirm |
| 39 | pokpok | prostitute — degrading slur | — | jromest | FLAG: drum onomatopoeia in music materials — confirm |
| 40 | tsekwa | derogatory term for Chinese / Chinese-Filipino people | chekwa† | **added** | ethnic slur — confirm spelling variants |
| 41 | unano | person of short stature / dwarfism — derogatory when aimed at a person | — | **added** | FLAG: folk tales ("Unano at Higante"), literary registers — confirm |

## 4. Review area C — Category 3: sexual content (13 entries)

Action when matched: **reject** — the write is refused outright and the rule is named in the response. This is the category where the known limitations concentrate: plain anatomy vocabulary on the English side is indistinguishable from sexual content by word list, and on the Filipino side the regional-language entries (iyot, kayat) carry legitimate homograph senses in other Philippine languages. Those collisions are catalogued in section 7 and are part of what you are signing off. Glosses are clinical by design; the matching is case-insensitive and boundary-safe in all cases.

| # | Term | Gloss | Variants also matched | Source | Reviewer notes |
|---|---|---|---|---|---|
| 42 | kantot | vulgar verb for sexual intercourse | kinantot†, kantotan, kantut, kantutan, nagkantutan† | both | |
| 43 | hindot | vulgar verb for intercourse (Visayan) | hinindot†, hindutan | jromest | |
| 44 | iyot | vulgar verb for intercourse (Visayan/regional) | iniyot | jromest | FLAG: regional homograph senses — section 7 item 6 |
| 45 | kayat | vulgar verb for intercourse (Ilocano) | — | jromest | FLAG: Ilocano "want" — section 7 item 5 |
| 46 | jakol | vulgar verb, male masturbation | nagjakol†, nagjajakol† | LDNOOBW | |
| 47 | burat | vulgar term for penis | — | both | |
| 48 | bilat | vulgar term for genitalia (Visayan) | — | jromest | |
| 49 | bayag | scrotum / testicles (vulgar) | — | LDNOOBW | |
| 50 | tamod | semen | — | jromest | |
| 51 | titi | penis (childish-vulgar) | tite, tete, teti, etits | jromest | allowlist carries "tete-a-tete" — section 6 |
| 52 | puki | vulva (vulgar) | pukeng, pepek†, kikinginamo | jromest | kikinginamo = compressed "puki ng ina mo" |
| 53 | habal | illicit-carnal term | — | jromest | allowlist carries "habal-habal" — section 6 |
| 54 | binibrocha | vulgar sexual slang built on brocha ("brush") | — | jromest | "brocha" itself was removed — see section 5 |

## 5. Review area D — seed entries NOT carried (confirm the removals)

The raw seeds totaled roughly 108 unique entries before curation; the tables above carry 54 canonical terms. Everything dropped is listed in the dataset header with a reason, and the removals are as much a part of this sign-off as the entries kept — a removal that is wrong is a moderation gap. Confirm each class below, and pay particular attention to the two "unaccounted" items at the end of this section, which need an explicit disposition from you.

**Removed for colliding with legitimate school vocabulary** (each read in the raw list before deciding; reasons as recorded in the dataset header): boto (vote — civic/election vocabulary), brocha (paintbrush — art class, maintenance), gaga (nickname; Lady Gaga), kiki (nickname), habal kept but see section 6, inutil (ordinary adjective used in formal writing), hudas (Judas; also a surname), lintik (lightning — science class, mild), olok (naglolok — joking), poke (English "poke"), poki (brand name), puke (English "puke" = vomit — common school word), puking (English present tense of puke), suso / susu (snail — biology; nursing), lechugas (lettuce — markets, nutrition), hinampak (ordinary verb "was hit"), bogo (Bogo City), and the meaning-unverified entries kept out rather than guessed: inutel, kagang, kaululan, ratbu, tinil, tungaw.

**Unaccounted items needing your explicit disposition:**

| Seed entry | Source | Current status | Question for you |
|---|---|---|---|
| nimal | jromest | neither carried nor listed in the removal comment | meaning unverified (possibly a truncation/evasion of "animal") — confirm keep-out, or provide a reading to act on |
| tang ina (spaced) | LDNOOBW | covered by the tangina entry via the glue matcher | no action needed if you agree spaced "tang ina" must be caught — it is, by design |

## 6. Review area E — allowlist interplay (Filipino-relevant entries)

The allowlist (src/lib/moderation/allowlist.ts) suppresses any category match whose span sits inside an allowlisted phrase, so a legitimate compound survives while its vulgar root alone still fires. Three entries are Filipino-relevant and are effectively part of this sign-off: **habal-habal** (provincial motorcycle transport — keeps announcements about getting to campus safe while habal alone stays flagged), **leche flan** (cafeteria and fundraiser staple — while leche alone stays flagged), and **tete-a-tete** (French borrowing in formal announcements — while tete, a variant of titi, stays flagged). The remaining entries are English/academic and listed for context: cum laude, sex education, sex ed, shiitake, scat singing, retardant.

Word-boundary protection is the other half of the false-positive guard and needs no allowlist entries: standalone legitimate words that merely contain a term as a substring (bass, cockpit, analysis, title, grape, Essex — and Filipino-side "ang gatas" after glue) never fire, because every pattern asserts boundaries. This is verified in the corpus (section 8). Confirm that the three Filipino-relevant allowlist entries are the right ones and that none are missing — if you know a legitimate Filipino compound built on a flagged root (the habal-habal pattern), it belongs here.

## 7. Known limitations this sign-off covers

These are the engine's known, accepted limitations that involve Filipino judgment (recorded in the vetting record, section 9). For each: acknowledge it as acceptable for v1, or propose a mitigation — a dataset change, an allowlist addition, or a policy change. Every mitigation you propose is a follow-up patch to the dataset or config, not a rearchitecture.

1. **Mid-sentence separator-hidden slurs escape the glue matcher by design.** Whole-text spaced vandalism (`n i g g e r` as a title, `g a g o` alone) is caught; the same letters hidden mid-sentence with separators are not, because catching them safely would re-open the junction false positives ("ang gatas" → "ngga") that were the original bug. Acknowledged / propose:
2. **Biology-class anatomy vocabulary is rejected as sexual content.** "Penis", "vagina" and company in a legitimate biology context are indistinguishable from category 3 by word list; the write is refused and the teacher needs admin follow-up. (This is English-side but affects the same teachers you are thinking about.) Acknowledged / propose:
3. **English-side library quirks that survive the plain matcher:** "Dick" as a name, "pentanal" / "butanal" chemistry strings, "Fukushima". Acknowledged / propose:
4. **tae vs the Korean romanization.** K-pop club announcements romanizing 태 as "Tae" will be flagged as profanity. Options: allowlist is wrong here (too broad — it would also let the vulgarity through); the realistic mitigation is admin follow-up on the flag. Acknowledged / propose:
5. **kayat — Ilocano homograph.** In Ilocano, kayat means "want" (kayat ko = I want); the sexual reading is the vulgar Ilocano verb. Ilocano text on the portal will false-positive. Acknowledged / propose:
6. **iyot — regional homograph senses.** The vulgar reading is Visayan; other regional senses exist (e.g., movement/turning in some registers). Confirm which senses are live on a school portal and whether the flag rate is acceptable. Acknowledged / propose:

## 8. Verification evidence (what is already tested — and what only you can cover)

The engine corpus (scripts/moderation-smoke.ts, run by scripts/verify-moderation.sh) passes **84/84** as of PR #44: the clean corpus — school announcements, honors lists, cafeteria menus, Filipino food and transport words (habal-habal, leche flan), the seed-trap vocabulary of section 5, "ang gatas", "mas lutong", Bob Ong, Uranus/tetanus, "an alibi", "ran us", "wash it", fire retardant — flags **zero**; the dirty corpus — bilingual profanity, inflected Tagalog (ginago, kagaguhan, kantutan), leet and homoglyph masking, separator-hidden and glued compounds, untrusted URLs — is caught in full. Route-level verification passes **22/22** across all five write surfaces: dirty writes return 422 naming the rule and action, clean writes persist, and moderation_logs carries the audit rows (rule ids, actions, matched terms, reviewPending, actor stamps).

What no corpus covers, and the reason this sign-off exists as an owner action rather than another script: regional-language coverage beyond the entries tagged above (Visayan, Ilocano, Hiligaynon reach of a "Tagalog" list), evolving slang and euphemism drift, the register judgments in sections 2–4 (is a term still live as an insult for students today, or dated?), and the folk/literary collisions flagged for your confirmation. Your verdicts close exactly that gap.

## 9. Sign-off sheet

- [ ] **A. Category 1 inventory (section 2)** — 33 entries: tags correct, glosses acceptable, variants sufficient for real-world inflection
- [ ] **B. Category 2 inventory (section 3)** — 8 entries: the profanity-vs-harassment boundary is drawn where you would draw it
- [ ] **C. Category 3 inventory (section 4)** — 13 entries: tags correct; regional homographs (iyot, kayat) dispositioned
- [ ] **D. Removals confirmed (section 5)** — including an explicit disposition for **nimal** and agreement on the "tang ina" glue coverage
- [ ] **E. Allowlist interplay confirmed (section 6)** — habal-habal, leche flan, tete-a-tete are right; nothing missing
- [ ] **F. Known limitations acknowledged (section 7)** — each accepted or carrying a proposed mitigation

Reviewer notes (corrections, additions, proposed mitigations — continue on a second sheet if needed):

> 
> 
> 

| | |
|---|---|
| **Reviewer name (print)** | |
| **Reviewer signature** | |
| **Date** | |
| **Owner receiving** | |
