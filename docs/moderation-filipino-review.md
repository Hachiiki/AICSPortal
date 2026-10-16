# Filipino Word-List Reviewer Sign-Off (Content Moderation)

- **Prepared:** 2026-10-16 · **Revision:** 2 — reviewer verdict applied · **Status:** revisions shipped (PR #45); sign-off still pending on the native-speaker items in section 11
- **Reviewer of record:** the owner-side review that returned the 2026-10-16 verdict "return for revisions" (summary in section 10). Native-speaker verification items remain open.
- **Data under review:** `src/lib/moderation/datasets/filipino.ts` as of PR #45 — 53 canonical entries, 51 matched variants, 104 matched strings in total
- **How to mark:** work through section 11 (the remaining native-speaker checklist) and the inventory tables, writing corrections beside the row they concern. Return the marked file to the owner.

## 1. What you are reviewing (primer)

The AICS portal moderates every user-authored string that persists to the database — announcements (admin), section notifications (faculty), task text (faculty), materials links (faculty), and profile fields (student). Moderation runs server-side in the API layer, next to the Zod validation, and a crafted direct API call cannot persist flagged content. The engine is the `obscenity` matcher (MIT, the single runtime dependency this epic added) fed by our own curated datasets — one matcher per rule category, so the fired rule is inherent to the match rather than inferred afterwards.

Filipino text is matched by five rule sets working together. Categories 1–3 are word lists (the subject of this sign-off): every entry is matched with word boundaries, so a term only fires as a standalone word and never inside a longer legitimate word. A second "glue" matcher per category additionally catches separator-hidden masking — `g a g o`, `p u t a n g i n a` — by stripping separators, using a junction-safe pattern set so glued legitimate phrases like "ang gatas" or "data analysis" cannot false-positive. Rule 4 is the URL policy (trusted-domain allowlist; suffix matching is dot-boundary anchored, so `drive.google.com.evil.io` does not inherit trust). Rule 5 is the false-positive guard: allowlisted phrases suppress any match inside their span.

**The contextual review path (new in revision 2).** A match's action is no longer decided by category alone: entries tagged *contextual* — because they collide with legitimate school registers — hold the write for admin review (**flag**) instead of rejecting it outright, even though their category default is reject. A clear-case term anywhere in the same write still rejects, and the 422 names the rule that is actually rejecting. This is the mechanism the reviewer's recommendations A, B and D asked for.

| Category | Rule id | Default action | Contextual entries (flag instead) |
|---|---|---|---|
| 1 — profanity / abusive language | `profanity` | **flag** | — (category default is already review) |
| 2 — harassment / discriminatory | `harassment` | **reject** | nognog, pokpok, unano |
| 3 — sexual content | `sexual` | **reject** | English clinical anatomy: anal, anus, ejaculate, masturbate, orgasm, penis, semen, vagina |

Both actions block persistence; the difference is tone, log priority, and the follow-up workflow (flag carries `reviewPending=true` for admin follow-up). Not in scope for this sign-off: the URL trusted-domain list, the engine code itself, and the moderation_logs audit trail — those are recorded in docs/moderation-library-vetting.md.

### 1.1 Category-decision rationale (reviewer recommendation C)

Tags follow the dominant register of the term, not its worst conceivable use:

- **Category 1** — insults aimed at intellect or behavior (the gago/bobo/tanga families), expletives and their euphemisms (the puta/punyeta/pakyu families), disgust expressions. These flag for review: an admin talks to the author.
- **Category 2** — terms that dehumanize a person or target a group: `animal ka`, `hayop ka`, `demonyo ka` (address the person as a non-person), `hinayupak` (beast), `nognog` (colorism), `pokpok` (degrading term for women), `tsekwa` (ethnic slur), `unano` (body-based). These reject.
- **Category 3** — intercourse vocabulary, vulgar anatomy, and sexual slang. These reject.

Boundary calls worth stating explicitly: `sira ulo` is category 1 (mental-state insult, not dehumanization) while `hayop ka` is category 2 (identity-level attack); `walang hiya` is category 1 (grave insult, but not group-targeting — membership itself is pending native verification); `kupal` is category 1 (vulgar personal insult); `tsekwa` is category 2 with no contextual tag (the slur reading dominates every register). Where the reviewer disagrees with any line drawn here, the fix is a one-line dataset change — category re-tag or contextual toggle.

**Attribution (carried in the dataset file header, re-verified 2026-10-16).** Seed data from jromest/filipino-badwords-list (MIT, 97 entries) and Shutterstock LDNOOBW `fil` (CC-BY-4.0, 14 entries including one duplicate). Both licenses' obligations are met: MIT attribution plus the CC-BY-4.0 attribution-and-license note appear in the dataset header, and this record names the sources. Category tags, inflected variants, removals, and the five additions are by the portal team. Provenance per entry: **jromest** (37 canonical), **LDNOOBW** (4), **both** (7), **added** (5 — buang, inamo, walang hiya, tsekwa, unano). **Dagger marks a variant the portal team added** (22 of the 51).

## 2. Review area A — Category 1: profanity and abusive language (33 entries)

Action when matched: **flag for review** (write refused pending admin follow-up). Glosses are deliberately clinical.

| # | Term | Gloss | Variants also matched | Source | Reviewer notes |
|---|---|---|---|---|---|
| 1 | gago | stupid (masculine-address insult) | ginago†, nagago†, nakakagago†, kagaguhan, gagong† | jromest | |
| 2 | gagi | variant of gago | — | jromest | gloss to be verified by a native speaker (revision 2: the earlier gendered characterization was removed per reviewer verdict) |
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
| 14 | sira ulo | "broken head," crazy | siraulo | jromest | category-1 vs hayop ka's category-2 — see 1.1 |
| 15 | tae | feces ("shit") | — | jromest | Korean romanization collision — see section 8 item 4 |
| 16 | amputa | contraction of "anak ng puta" | — | jromest | |
| 17 | bwesit | expletive, "damn" (Hokkien-derived) | bwisit, bwiset† | jromest | |
| 18 | leche | lit. "milk"; Spanish-derived expletive | leching | jromest | allowlist carries "leche flan"; sentence-level contexts tested — section 8 item 5 |
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
| 31 | walang hiya | "shameless" — grave insult in PH moral vocabulary | — | **added** | membership pending native verification; legitimate educational sentences tested (flag, corpus-documented) — section 11 |
| 32 | nakakaburat | "so irritating / disgusting" | — | jromest | |
| 33 | pesteng yawa | "damn devil" (yawa: Visayan for demon) | — | jromest | |

## 3. Review area B — Category 2: harassment and discriminatory language (8 entries)

Default action: **reject**. Entries marked **contextual** instead **flag for review** (revision 2) — their legitimate school registers (folk tales, storybooks, music materials) are real, so a match is held for an admin rather than refused. Current-usage verification by a native speaker remains open for each.

| # | Term | Gloss | Variants also matched | Source | Contextual | Reviewer notes |
|---|---|---|---|---|---|---|
| 34 | animal ka | "you animal" — dehumanizing | — | jromest | | |
| 35 | hayop ka | "you beast" — dehumanizing | hayup | jromest | | |
| 36 | demonyo ka | "you devil" — dehumanizing | — | jromest | | |
| 37 | hinayupak | "beast, monster" — strong dehumanizing insult | — | jromest | | |
| 38 | nognog | dark-skinned person — colorist slur | — | LDNOOBW | **yes** | folk-tale registers flagged; current-usage verification open — section 11 |
| 39 | pokpok | prostitute — degrading slur | — | jromest | **yes** | drum onomatopoeia in music materials flagged |
| 40 | tsekwa | derogatory term for Chinese / Chinese-Filipino people | chekwa† | **added** | | ethnic slur — clear case, stays reject |
| 41 | unano | person of short stature / dwarfism — derogatory when aimed at a person | — | **added** | **yes** | "Unano at Higante"-style storybooks flagged |

## 4. Review area C — Category 3: sexual content (12 entries)

Default action: **reject**. The English clinical-anatomy subset (anal, anus, ejaculate, masturbate, orgasm, penis, semen, vagina) is **contextual** — it flags for review instead, so biology and health-education lessons are held for an admin, not refused (reviewer recommendation D; PR #45). Explicit slang and abuse vocabulary keep the hard reject; mixed text with both a contextual and a clear-case term still rejects. Glosses are clinical by design.

| # | Term | Gloss | Variants also matched | Source | Reviewer notes |
|---|---|---|---|---|---|
| 42 | kantot | vulgar verb for sexual intercourse | kinantot†, kantotan, kantut, kantutan, nagkantutan† | both | |
| 43 | hindot | vulgar verb for intercourse (Visayan) | hinindot†, hindutan | jromest | |
| 44 | iyot | vulgar verb for intercourse (Visayan/regional) | iniyot | jromest | regional homograph senses — pending native verification (section 11) |
| 45 | jakol | vulgar verb, male masturbation | nagjakol†, nagjajakol† | LDNOOBW | |
| 46 | burat | vulgar term for penis | — | both | |
| 47 | bilat | vulgar term for genitalia (Visayan) | — | jromest | |
| 48 | bayag | scrotum / testicles (vulgar) | — | LDNOOBW | |
| 49 | tamod | semen | — | jromest | |
| 50 | titi | penis (childish-vulgar) | tite, tete, teti, etits | jromest | allowlist carries "tete-a-tete" — section 6 |
| 51 | puki | vulva (vulgar) | pukeng, pepek†, kikinginamo | jromest | kikinginamo = compressed "puki ng ina mo" |
| 52 | habal | illicit-carnal term | — | jromest | allowlist carries "habal-habal" — section 6 |
| 53 | binibrocha | vulgar sexual slang built on brocha ("brush") | — | jromest | "brocha" itself was removed — see section 5 |

**Removed in revision 2:** `kayat` — the Ilocano homograph ("kayat ko" = "I want") made ordinary Ilocano sentences unconditionally rejected as sexual content (reviewer high-priority item A). Removed from the dataset entirely; the corpus now asserts an Ilocano sentence is clean. It may return — behind the contextual review path or with a verified reading — once an Ilocano-speaking reviewer signs off (section 11).

## 5. Review area D — seed entries NOT carried (removals confirmed; dispositions recorded)

The raw seeds totaled roughly 108 unique entries before curation; the tables above carry 53 canonical terms. Removals are as much a part of this sign-off as the entries kept.

**Removed for colliding with legitimate school vocabulary** (each read in the raw list before deciding; reasons recorded in the dataset header): boto (vote — civic/election vocabulary), brocha (paintbrush — art class, maintenance), gaga (nickname; Lady Gaga), kiki (nickname), inutil (ordinary adjective used in formal writing), hudas (Judas; also a surname), lintik (lightning — science class, mild), olok (naglolok — joking), poke (English "poke"), poki (brand name), puke (English "puke" = vomit — common school word), puking (English present tense of puke), suso / susu (snail — biology; nursing), lechugas (lettuce — markets, nutrition), hinampak (ordinary verb "was hit"), bogo (Bogo City), and the meaning-unverified entries kept out rather than guessed: inutel, kagang, kaululan, ratbu, tinil, tungaw.

**Dispositions recorded in revision 2 (previously unaccounted):**

| Seed entry | Source | Disposition |
|---|---|---|
| nimal | jromest | **KEEP-OUT** (2026-10-16): meaning unverified, plausibly an evasion truncation of "animal". Documented in the dataset header. Revisit only if a native speaker provides a reading. |
| tang ina (spaced) | LDNOOBW | covered by the tangina entry via the glue matcher (by design) |
| kayat | jromest | **REMOVED** (2026-10-16, reviewer item A): Ilocano homograph — see section 4 |

## 6. Review area E — allowlist interplay (Filipino-relevant entries)

The allowlist suppresses any category match whose span sits inside an allowlisted phrase. Four entries are Filipino-relevant: **habal-habal** (provincial motorcycle transport), **leche flan** (cafeteria and fundraiser staple), **tete-a-tete** (French borrowing; protects the tete variant of titi), and — new in revision 2 — **anal fin** (biology: fish anatomy, protecting the contextual anal entry). The remaining entries are English/academic: cum laude, sex education, sex ed, shiitake, scat singing, retardant.

The allowlist cannot conceal abuse elsewhere in a longer input: suppression is span-contained, so "Leche flan fundraiser and gago ka rin naman" still fires on gago — asserted in the corpus (three concealment probes). Word-boundary protection needs no allowlist entries: standalone legitimate words that merely contain a term as a substring (bass, cockpit, analysis, title, grape, Essex — and "ang gatas" after glue) never fire.

## 7. The contextual review path (how flag-instead-of-reject works)

Implemented in `src/lib/moderation/policy.ts` (`decide()`) with the term sets in the datasets (PR #45). A finding whose canonical term is contextual contributes flag-for-review rather than rejection; the write is refused with the rule's hedged "held for review" message and logged with `reviewPending=true`. One clear-case finding anywhere in the same write still rejects the whole write, and the primary rule named in the 422 is the highest-precedence rule that is actually rejecting (mixed contextual-sexual + clear-harassment text is refused as harassment, not mislabeled sexual). Corpus assertions cover every branch of this table: contextual-only flags; contextual + clear on the same rule rejects; contextual on one rule + clear on another rejects with the clear rule named.

## 8. Known limitations (updated in revision 2)

1. **Mid-sentence separator-hidden slurs escape the glue matcher by design.** Whole-text spaced vandalism is caught; the same letters hidden mid-sentence with separators are not, because catching them safely would re-open the junction false positives ("ang gatas" → "ngga"). Unchanged; accepted for v1.
2. **Biology-class anatomy vocabulary — MITIGATED.** Clinical terms now flag for review instead of rejecting (the reviewer's recommendation D). The write is still held pending admin follow-up; "anal fin" is allowlisted outright. Abuse vocabulary ("rape", "incest") and explicit slang keep the hard reject.
3. **English-side library quirks that survive the plain matcher:** "Dick" as a name, "pentanal" / "butanal" chemistry strings, "Fukushima". Unchanged; accepted.
4. **tae vs the Korean romanization.** K-pop club announcements romanizing 태 as "Tae" flag as profanity (flag = admin follow-up, the soft outcome). An allowlist entry is wrong here (too broad); the flag path is the mitigation.
5. **leche sentence-level contexts.** "Leche flan" is allowlisted; standalone leche (e.g., a vocabulary lesson on Spanish loanwords) flags as profanity — corpus-documented, admin follows up. Native verification of how often the milk reading is live on a school portal remains open.
6. **iyot regional homograph senses.** Stays reject pending native verification (the reviewer did not send it back, but section 11 keeps it on the native-speaker list).
7. **kayat — RESOLVED by removal** (revision 2). Revisit only with Ilocano-speaker sign-off.

## 9. Verification evidence (corpus revision 2, PR #45)

Engine corpus: **105/105** — dirty corpus 32 (bilingual profanity, inflected Tagalog, leet, homoglyph and fullwidth normalization, zero-width injection, separator-hidden, glued compounds, three allowlist-concealment probes); clean corpus 37 + 8 allowlist-save assertions (school announcements, honors lists, cafeteria menus, Filipino food and transport, the seed-trap vocabulary, "ang gatas", Bob Ong, Uranus/tetanus, "an alibi", "ran us", "wash it", fire retardant, anal fin, and an Ilocano sentence using kayat — clean since removal); **review-path corpus 7** (biology anatomy, Nognog tale, Unano at Higante, pokpok rhythm, walang hiya values-education, leche vocabulary lesson — each must flag, never reject); URL policy 11 (trusted subdomains, deceptive trusted-domain-infix and lookalike-prefix hosts stay untrusted, www normalization, prose extraction); policy decisions 10 (the full contextual decision table). Route-level end-to-end: **24/24** — every surface returns 422 naming rule + action on dirty writes (including the two contextual route cases: biology anatomy and the Nognog tale return action=flag), clean writes persist, and moderation_logs carries the audit rows including a `sexual`+`flag` review-pending row.

What no corpus covers, and the reason native-speaker sign-off remains: regional-language coverage, evolving slang, register judgments (is a term still live as an insult for students today?), and the folk/literary collision calls.

## 10. Reviewer verdict of 2026-10-16 and the applied revisions

Verdict: **"Return for revisions"** — the architecture was judged sound; the linguistic decisions were not yet approvable. Required items and their dispositions:

| Required before approval | Disposition in revision 2 |
|---|---|
| Resolve the kayat false-positive with an Ilocano-speaking reviewer | kayat removed outright (the interim mitigation the verdict's recommendation A offers); Ilocano-speaker verification listed in section 11 for any re-inclusion |
| Verify the disputed folk-tale and educational vocabulary | nognog, pokpok, unano moved to the contextual review path (flag, not reject); clinical anatomy likewise (recommendation D); corpus sentences added; current-usage verification remains with native speakers |
| Correct questionable glosses and document category decisions | gagi gloss neutralized ("variant of gago", pending native verification); category-decision rationale documented (section 1.1) |
| Record a decision for nimal | KEEP-OUT, recorded in the dataset header and section 5 |
| Run legitimate school-content tests after corrections | corpus revision 2: the review-path class (7 school-content sentences) plus concealment, deceptive-URL and normalization probes — 105/105 |
| Verify source attribution and license obligations | re-verified: MIT (jromest) and CC-BY-4.0 (LDNOOBW) attribution carried in the dataset header and this record |

Technical checks the verdict asked to verify (not assume): normalization (case folding, homoglyphs, zero-width, separators — corpus-asserted), word boundaries (Filipino affixes via variants, multiword entries, punctuation — corpus-asserted), allowlist concealment (span-containment probes — corpus-asserted), URLs (dot-boundary suffix match; deceptive hosts corpus-asserted), audit logs (moderation_logs rows verified route-level; an admin reader view is future work, retention policy undefined — noted), error handling (dirty writes 422 with no persistence, clean writes persist — route-asserted).

## 11. Remaining native-speaker verification (the open sign-off surface)

- [ ] **Ilocano**: verify the vulgar reading of kayat and whether it should return behind the contextual review path
- [ ] **Folk/literary current usage**: nognog, unano (and pokpok as drum onomatopoeia) — confirm the contextual flag is the right call versus removal
- [ ] **gagi gloss**: provide a neutral gloss
- [ ] **walang hiya membership**: insult versus values-education vocabulary; currently category 1 (flag) with educational sentences corpus-documented
- [ ] **leche sentence-level contexts**: how live is the milk reading on a school portal; currently flag with "leche flan" allowlisted
- [ ] **iyot regional senses**: confirm the reject tag against Visayan/regional usage
- [ ] **Full inventory walkthrough**: category tags (sections 2–4) drawn where a native speaker would draw them; inflected variants sufficient; removals (section 5) correct

Reviewer notes (corrections, additions, proposed mitigations):

>
>
>

| | |
|---|---|
| **Reviewer name (print)** | |
| **Reviewer signature** | |
| **Date** | |
| **Owner receiving** | |

## 12. Revision log

- **Revision 1 (2026-10-16):** initial package — 54 entries, per-section sign-off sheet, evidence summary.
- **Revision 2 (2026-10-16, this document):** reviewer verdict applied — contextual review path shipped (PR #45: policy.ts decide, dataset term sets, engine predicate); kayat removed; nimal keep-out recorded; gagi gloss neutralized; "anal fin" allowlisted; category-decision rationale added (1.1); limitations updated with mitigation status; corpus revision 2 (105/105) and route-level 24/24 evidence recorded; native-speaker checklist re-scoped to the genuinely open items (section 11).
