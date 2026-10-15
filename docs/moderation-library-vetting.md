# Content Moderation — Library Vetting (Decision Record)

- Date: 2026-10-16
- Status: gate satisfied for the shortlist below; decision made, pending owner sign-off
- Satisfies: the library-vetting-gate item of the Content Moderation epic in TODO.md
- Method: every fact below was verified against a live source on 2026-10-16 — the npm
  registry download API, GitHub repos and raw license files, vendor documentation pages,
  or a headless-browser render of the one JS-only docs page. Nothing is quoted from
  memory alone. Sources are listed at the end.

## 1. Verdict

BUILD a thin in-house moderation module on the obscenity engine. No hosted moderation
API passes the Filipino language gate today, and no word-list library ships a Filipino
list of acceptable quality — so the word data must be ours regardless of engine choice.
The plan: exactly one new MIT-licensed runtime dependency (obscenity) as the matching
engine, our own curated bilingual datasets with category tags, our own allowlist layer,
and a hand-rolled URL policy. A hosted classifier (OpenAI moderation) stays available as
an optional, config-gated, flag-only second layer for a later date, because its Filipino
quality is unpublished.

Why not buy an API outright: see section 4 — Perspective has no Filipino at all, Azure
Content Moderator is deprecated, Azure Content Safety is not trained for Filipino, and
OpenAI publishes no per-language quality. Why not zero dependencies: writing yet another
matcher re-solves evasion resistance (elongation, leet, homoglyphs, zero-width
injection) that obscenity already solves and tests for; maintaining a good matcher costs
more than one pinned MIT dependency.

## 2. Engine candidates — the four gate points

| Package | License | Filipino? | Maintenance (verified 2026-10-16) | False-positive posture |
|---|---|---|---|---|
| obscenity | MIT (raw LICENSE.md, Copyright 2025 Joseph Liu) | no dataset, but first-class custom datasets | v0.4.6 released 2026-01-18; last repo commit 2026-08-23; 292 commits; 182 stars; 359,033 npm downloads/week — the highest of all vetted candidates | word boundaries and whitelisted phrases are first-class features; independent benchmark: 16/20 evasion cases caught, 1/15 traps flagged (flags "shiitake") |
| bad-words | MIT (Copyright 2013 Michael Price) | no; custom list via the list option — the documented pairing with filipino-badwords-list | v4.1.5, published about 3 months before this vetting; 183,986 downloads/week; 161 dependents | 0/15 traps per the same benchmark, but a whole-word matcher that misses compounds and evasion (9/20; community reports it filters a standalone profanity but not the same word glued into a compound) |
| @2toad/profanity | MIT | no (English, German, French) | v3.3.0, published about 7 months before this vetting; 91,650 downloads/week; TypeScript | thin word-list matcher — the benchmark reports it misses half to two-thirds of the evasion battery |
| allprofanity | MIT | no (English, Hindi, French, German, Spanish, Bengali, Tamil, Telugu, Brazilian Portuguese, Greek) | v2.4.0, 2026-06-12; 34 commits since 2025-04; 42 stars; 1,376 downloads/week | best self-published numbers: 19/20 evasion, 0/15 traps; word boundaries ("assassin", "assistance"); context patterns (medical terms, negation) |
| leo-profanity | MIT | no (English, French, Russian) | 56,152 downloads/week but effectively frozen upstream; GitHub issue 22 (2021) confirms English-only default | substring-era matcher, no evasion handling |
| naughty-words | CC-BY-4.0 (data, not code) | data package only — see section 3 | mirrors LDNOOBW, repo frozen since 2020 | no engine |

The benchmark numbers are allprofanity's self-published comparison, reproduced in its
README with a reproducible script. Self-serving benchmarks deserve skepticism, but the
direction matches independent community reports about bad-words and the thin matchers,
and we will re-run the relevant traps ourselves against our own corpus in the
verification script — that re-run is the number that actually gates integration.

### 2.1 obscenity — chosen, in detail

- Repository: https://github.com/jo3-l/obscenity — MIT, TypeScript, zero runtime
  dependencies, ESM and CJS builds.
- API: RegExpMatcher fed by datasets plus recommended transformers; TextCensor for
  masking. Matches elongations (a profanity stretched with extra vowels), Unicode
  homoglyph lookalikes, and words concatenated without spaces, out of the box.
- False-positive posture is a stated design goal of the library: adding whitelisted
  phrases is as easy as adding a string to an array, and word boundaries are equally
  simple. That is rule 5 of our epic, built in rather than bolted on.
- Custom datasets are first-class, which is how the Filipino list ships: one matcher
  instance per rule category, each fed its own dataset, so the fired rule is inherent
  to the matcher that matched — no post-hoc classification step.
- TypeScript-native with zero deps fits the Vercel serverless route handlers directly.

Runner-up: allprofanity. Stronger published evasion scores, severity scoring
(MILD/MODERATE/SEVERE/EXTREME — a useful idea to copy into our datasets), and
vocabulary-hiding (the word list cannot be extracted by a client). But it is a
one-year-old project with one primary maintainer and 1,376 downloads/week versus
obscenity's 359,033. Revisit at the next review if obscenity stalls.

### 2.2 Rejected engines

- bad-words: maintained and hugely adopted, but the weakest matcher of the vetted set
  (whole-word only, 9/20 evasion). Acceptable only as the documented loader for the
  jromest Filipino list; obscenity subsumes that use.
- @2toad/profanity and leo-profanity: fail the language gate (no Filipino) and are thin
  matchers besides.

## 3. Filipino word data — vetted separately, because no library ships an acceptable list

Two usable sources, both vetted on 2026-10-16:

1. jromest/filipino-badwords-list — MIT, on npm, exports an array, an object, and a
   regex; 97 entries. Last content commit 2018-10 (dependency bumps to 2020-07); 162
   downloads/week. Designed to plug into bad-words as a custom list. As pure data, the
   staleness is acceptable; the curation is not — see the traps below.
2. Shutterstock LDNOOBW, the fil directory — CC-BY-4.0 (attribution required), 14
   entries including one duplicate, added 2016-03; the repo has been stable since
   2020-07 and has 3.5k stars. Consumable via the naughty-words npm package or directly
   from the repository.

The combined seed is roughly 108 unique entries before our curation.

### 3.1 Concrete false-positive traps found in the raw lists — the reason rule 5 exists

These are real collisions with legitimate portal vocabulary, found by reading both
lists end to end:

- boto — the ordinary Filipino word for "vote" (civic and election vocabulary) sits in
  the jromest list as vulgar slang.
- brocha — "paintbrush" (art classes, maintenance requests) is listed as vulgar slang.
- gaga — collides with the common nickname and every Lady Gaga reference.
- kiki — common nickname.
- habal — the prefix of habal-habal, the legitimate provincial motorcycle transport.
- inutil — an ordinary adjective ("useless") used in formal writing.
- hudas — Judas; also encountered as a surname.
- English-side classics our own matcher must survive: shiitake (obscenity's one
  benchmark miss — think cafeteria menu), Scunthorpe, classic, bass, assassin and
  assistance (word-boundary cases), analysis, cockpit, Essex.
- Tagalog morphology: inflected and affixed forms (gago -> ginago, nagago, nakakagago,
  kagaguhan) mean a naive word-boundary list misses most real-world usage, while
  substring matching explodes the false positives above. The engine's transformer
  design plus explicit inflected dataset entries is the workable middle path.

### 3.2 What our curation must add

- Category tags per entry (1 profanity/abusive, 2 harassment/discriminatory, 3 sexual).
  Neither source has categories: phrases like "animal ka", "hayop ka", "demonyo ka" are
  harassment-flavored; gago, bobo, tanga, ulol, engot are insults; the putang-ina
  family is strong profanity; the kantot, jakot and iyot families are sexual.
- Deduplication, removal of overbroad entries, addition of inflected variants.
- A Filipino-speaking reviewer signs off the final list (owner action — see section 7).

## 4. Hosted moderation APIs — all fail the language gate today

- Perspective API (Google/Jigsaw) — the language table was verified by rendering the
  docs page (a JS-only Google Sites page; a headless browser was used): TOXICITY
  covers Arabic, Chinese, Czech, Dutch, English, French, German, Hindi, Hinglish,
  Indonesian, Italian, Japanese, Korean, Polish, Portuguese, Russian, Spanish —
  seventeen languages, no Filipino. SEVERE_TOXICITY, IDENTITY_ATTACK, INSULT, PROFANITY
  and THREAT cover only German, English, Spanish, French, Italian, Portuguese and
  Russian. SEXUALLY_EXPLICIT is experimental. Free tier, but: no Filipino, per-request
  egress of student content to Google, latency and quota management, API key custody.
  REJECTED on language.
- OpenAI Moderation (omni-moderation-latest) — free; the 2024-09 upgrade announcement
  reports gains across 98% of tested languages including low-resource ones, but no
  per-language list is published, so Filipino quality is unverifiable without our own
  evaluation. Its categories (harassment, hate, sexual, sexual/minors, violence,
  self-harm) map beautifully onto our rules 1-3. DEFERRED: an optional, config-gated,
  flag-only layer after we run our own Filipino eval corpus through it; never the
  block-decider; needs owner consent for egress and an API key.
- Azure Content Moderator — deprecated 2024-02, retires 2027-03-15 per
  learn.microsoft.com. DISQUALIFIED regardless of anything else.
- Azure AI Content Safety (the successor) — claims 100+ supported languages, but the
  trained-and-tested list is Chinese, English, French, German, Japanese, Spanish,
  Italian and similar; Filipino is not in the trained set. A paid Azure account plus
  region setup for a Vercel-deployed school portal is overhead with no vetted payoff.
  REJECTED.

## 5. Decision mapped onto the five rule sets

One new runtime dependency: obscenity (MIT). Everything else is ours.

1. Profanity and abusive language — an obscenity matcher fed by curated English (its
   built-in dataset minus entries we reject) plus our curated Filipino dataset,
   category 1.
2. Harassment and discriminatory language — a separate matcher and dataset, category 2,
   so the action can differ (reject outright versus flag for review) and the API
   response names the rule that fired.
3. Sexual-content classification — a separate matcher and dataset, category 3.
4. Website and URL restrictions — no library: extract URLs (regex plus WHATWG URL
   parsing), suffix-match hosts against a trusted-domain allowlist (the school site,
   res.cloudinary.com, drive and docs google domains for materials), and apply a
   per-audience policy (block for student submissions versus flag for review
   elsewhere). The owner decides the domain list.
5. Allowlisted words — evaluated before any flag fires: exact-match and
   word-boundary-safe exemptions drawn from our corpus (the traps in section 3.1,
   school terms, Filipino names and places, subject titles).

Enforcement stays server-side, in the API routes next to the existing Zod layer
(src/lib/validation.ts): violations return a 4xx naming the rule that fired; every
allow, reject and flag decision is logged with rule id and matched terms (a
moderation_logs collection, mirroring the grade_audits convention). Frontend checks,
if any, are advisory only — a crafted direct API call must never persist flagged
content.

## 6. Compliance and dependency notes

- package.json gains exactly one runtime dependency: obscenity (MIT).
- The LDNOOBW fil data is CC-BY-4.0: attribution comment in the dataset file plus this
  record is the compliance path.
- The jromest list is MIT: attribution comment in the dataset file.
- No student content leaves our server to any third party in the decided architecture.

## 7. Open questions for the owner

1. URL policy per audience: hard-block external links in student task submissions, or
   flag for review? Which trusted domains beyond the school site, Cloudinary, and
   Google Drive?
2. Who curates and signs off the Filipino list? A Filipino-speaking reviewer is
   required for the category tags and the inflected forms — this is the single
   highest-leverage owner contribution to the whole epic.
3. Is the optional OpenAI flag-only layer wanted at all? It needs an API key, an egress
   decision, and a Filipino evaluation pass first.
4. Action per rule: reject with a named-rule 4xx immediately, or a flag-for-review
   queue first with outright rejection reserved for the sexual and harassment
   categories?

## 8. Next steps — implementation order

1. Add obscenity; build src/lib/moderation/ with the three category matchers plus the
   URL and allowlist rules; wire into the parseBody pipeline of the write routes.
2. Curate the Filipino dataset: seed from the two vetted sources, tag categories, add
   inflected variants, remove or allowlist the traps from section 3.1.
3. Write scripts/verify-moderation.sh following the verify-admin-portal.sh convention:
   a clean corpus (school announcements, subject titles, Filipino names and places,
   code-switched everyday sentences, the section 3.1 traps) that must flag zero, and a
   dirty corpus (bilingual profanity, inflected forms, leet and masked variants, URLs)
   that must be caught — with the count-asserted pass/fail the other verify scripts
   use.
4. A moderation_logs collection and an admin view later, if the flag-for-review path
   is chosen.

## Sources verified on 2026-10-16

- npm registry download API — weekly download figures for all seven packages
- https://github.com/jo3-l/obscenity plus its raw LICENSE.md
- https://www.npmjs.com/package/bad-words — version, license, publish recency
- https://www.npmjs.com/package/@2toad/profanity
- https://github.com/ayush-jadaun/AllProfanity — README benchmark table, language
  list, feature list
- https://github.com/jojoee/leo-profanity issue 22
- https://github.com/jromest/filipino-badwords-list plus its raw array export
- https://github.com/shutterstock/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words
  — license header, language list, raw fil file
- https://developers.perspectiveapi.com/s/about-the-api-attributes-and-languages —
  rendered via headless browser; language table quoted in section 4
- https://openai.com/index/upgrading-the-moderation-api-with-our-new-multimodal-moderation-model
  and https://developers.openai.com/api/docs/guides/moderation
- https://learn.microsoft.com/en-us/azure/ai-services/content-moderator/overview and
  the Azure AI Content Safety overview and region-availability pages
