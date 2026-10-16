// Moderation engine corpus gate — revision 2 (reviewer verdict 2026-10-16).
// Dev-branch gate run by scripts/verify-moderation.sh; extends the original
// corpus with the reviewer's required school-content tests:
//   - a REVIEW class: contextual terms (clinical anatomy, folk-tale /
//     literary registers) must FLAG for review, not reject;
//   - kayat (Ilocano homograph) removed — an ordinary Ilocano sentence is clean;
//   - allowlist-concealment probes (abusive term elsewhere still fires);
//   - deceptive-URL hosts (trusted-prefix and lookalike);
//   - normalization probes (zero-width injection, fullwidth homoglyphs).
import { scanText } from '../src/lib/moderation/engine'
import { decide } from '../src/lib/moderation/policy'
import { classifyUrl, extractUrlFindings } from '../src/lib/moderation/url-policy'

let pass = 0
let fail = 0
function check(label: string, cond: boolean, extra?: string) {
  if (cond) {
    pass++
    console.log(`  PASS  ${label}`)
  } else {
    fail++
    console.log(`  FAIL  ${label}${extra ? ' :: ' + extra : ''}`)
  }
}

const DIRTY: { text: string; rule: string }[] = [
  { text: 'The event was a fucking disaster', rule: 'profanity' },
  { text: 'Gago ka ba? Mag-aral ka muna.', rule: 'profanity' },
  { text: 'Nakakagago ang traffic sa EDSA', rule: 'profanity' },
  { text: 'Putang ina mo talaga', rule: 'profanity' },
  { text: 'you motherfucker', rule: 'profanity' },
  { text: 'f u c k you', rule: 'profanity' },
  { text: 'sh1t happens', rule: 'profanity' },
  { text: 'Bullshit requirements', rule: 'profanity' },
  { text: 'Pakyu sa nagbenta ng fake tickets', rule: 'profanity' },
  { text: 'Walang hiya ang mga nanloko', rule: 'profanity' },
  { text: 'Bobo mo mag-explain', rule: 'profanity' },
  { text: 'Tangina, late na naman ang bus', rule: 'profanity' },
  { text: 'n1gger', rule: 'harassment' },
  { text: 'Chinks should not be allowed here', rule: 'harassment' },
  { text: 'Tsekwa ka ba? Umuwi ka na.', rule: 'harassment' },
  { text: 'Nognog na naman siya pagkatapos ng beach', rule: 'harassment' },
  { text: 'free p0rn videos at this site', rule: 'sexual' },
  { text: 'Nagkantutan sila sa kwarto', rule: 'sexual' },
  { text: 'Gusto mo mag-iyot?', rule: 'sexual' },
  { text: 'hentai links in the group chat', rule: 'sexual' },
  { text: 'Ang titi ay parte ng anatomy', rule: 'sexual' },
  { text: 'fuuuuck this', rule: 'profanity' },
  { text: 'f u c k', rule: 'profanity' },
  { text: 'what the f u c k is this', rule: 'profanity' },
  { text: 'The answer is f u c k you teacher', rule: 'profanity' },
  { text: 'n i g g e r', rule: 'harassment' },
  { text: 'g a g o', rule: 'profanity' },
  // normalization probes (reviewer technical checks: zero-width + homoglyphs)
  { text: 'fu​ck this place', rule: 'profanity' },
  { text: 'ｆｕｃｋ ｙｏｕ', rule: 'profanity' },
  // allowlist-concealment probes: an abusive term elsewhere in a longer
  // input must still fire even though an allowlisted phrase is present
  { text: 'Leche flan fundraiser and gago ka rin naman', rule: 'profanity' },
  { text: 'cum laude list but n1gger in the comments', rule: 'harassment' },
  { text: 'habal-habal rates and putang ina mo', rule: 'profanity' },
]

const CLEAN: { text: string; save?: string }[] = [
  { text: 'Semestral break schedule and enrollment dates for AY 2026-2027' },
  { text: "Congratulations to our dean's listers: magna cum laude and summa cum laude awardees", save: 'cum laude' },
  { text: 'The cafeteria now serves LECHE FLAN every Friday afternoon.', save: 'leche flan' },
  { text: 'Transportation guide: habal-habal rates for the mountain field trip', save: 'habal-habal' },
  { text: 'Health class: sex education module next week', save: 'sex education' },
  { text: 'Biology: the reproductive system and human anatomy' },
  { text: 'Data analysis workshop in the computer laboratory' },
  { text: 'The classics club discusses Shakespeare and Othello' },
  { text: 'Music appreciation: the history of scat singing in jazz', save: 'scat singing' },
  { text: 'A tete-a-tete session with the campus guidance counselor', save: 'tete-a-tete' },
  { text: 'Lady Gaga and Bruno Mars concert streaming in the AVR' },
  { text: "Kiki's delivery service anime film showing" },
  { text: 'Volleyball practice moved to the covered court' },
  { text: 'Volcano watch: ashfall advisory for Batangas residents' },
  { text: 'Bogo City educational tour next month' },
  { text: 'Bass guitar ensemble auditions' },
  { text: 'Peacock, cockatoo and other birds at the wildlife exhibit' },
  { text: 'Classical and modern literature electives list' },
  { text: 'Taekwondo and arnis club tryouts' },
  { text: 'Paki-abot ng modules sa guro bago ang Biyernes' },
  { text: 'Botohan ng mga klaseng opisyal sa Biyernes' },
  { text: 'Ang suso at kuhol ay mollusks sa Biology class' },
  { text: 'Rizal course: Noli Me Tangere chapter analysis due Friday' },
  { text: 'Ang gatas at tinapay ay para sa almusal' },
  { text: 'Kain tayo ng shiitake ramen sa canteen', save: 'shiitake' },
  { text: 'An alibi was presented at the debate club meeting' },
  { text: 'The fans ran us out of the gymnasium' },
  { text: 'Uranus is visible in the night sky this month' },
  { text: 'Tetanus vaccination drive at the school clinic' },
  { text: 'Class schedule for the second semester is now posted' },
  { text: 'Bob Ong book report due on Monday' },
  { text: 'Fire retardant materials demonstration in the chemistry lab' },
  { text: 'Assessment and assignment deadlines for the fourth quarter' },
  { text: 'Please wash it before returning the equipment' },
  { text: 'Mas lutong ang pansit ngayong Sabado' },
  // reviewer verdict additions: biology (anal fin) + Ilocano (kayat removed)
  { text: 'Biology: the anal fin and dorsal fin of Tilapia', save: 'anal fin' },
  { text: 'Kayat ko ti mangan iti bigat' },
]

// Contextual terms (reviewer verdict recommendations B and D): matches must
// hold for admin review (flag), never reject outright. Educational and
// literary registers belong here; a clear-case term in the same text still
// rejects (asserted in the policy section below).
const REVIEW: { text: string; rule: string }[] = [
  { text: 'Biology worksheet: label the penis and vagina on the reproductive system diagram', rule: 'sexual' },
  { text: 'Health class: the digestive system ends at the anus', rule: 'sexual' },
  { text: 'Philippine Literature: the tale of Nognog and the seven-headed dragon', rule: 'harassment' },
  { text: 'Storybook corner: Unano at Higante retold for Grade 2 pupils', rule: 'harassment' },
  { text: 'Music module: the pokpok rhythm pattern on the gangsa drum', rule: 'harassment' },
  { text: 'ESP class: discuss what walang hiya means in Filipino values', rule: 'profanity' },
  { text: 'Leche: the Spanish word for milk in our vocabulary list', rule: 'profanity' },
]

console.log('== dirty corpus ==')
for (const { text, rule } of DIRTY) {
  const scan = scanText('body', text)
  const rules = new Set(scan.findings.map((f) => f.ruleId))
  check(
    `caught [${rule}]: ${text.slice(0, 40)}`,
    scan.findings.length > 0 && rules.has(rule as never),
    JSON.stringify(scan.findings.map((f) => [f.ruleId, f.canonical, f.matchedText]))
  )
}

console.log('== clean corpus ==')
for (const { text, save } of CLEAN) {
  const scan = scanText('body', text)
  check(
    `clean: ${text.slice(0, 40)}`,
    scan.findings.length === 0,
    JSON.stringify(scan.findings.map((f) => [f.ruleId, f.canonical, f.matchedText]))
  )
  if (save !== undefined) {
    check(
      `  allowlist saved: ${save}`,
      scan.allowlistSaves.includes(save),
      JSON.stringify(scan.allowlistSaves)
    )
  }
}

console.log('== review-path corpus (contextual terms flag, never reject) ==')
for (const { text, rule } of REVIEW) {
  const scan = scanText('body', text)
  const decision = decide('announcement', scan.findings, [], [])
  check(
    `review [${rule}]: ${text.slice(0, 40)}`,
    decision.action === 'flag' && decision.ruleId === rule,
    JSON.stringify({
      findings: scan.findings.map((f) => [f.ruleId, f.canonical]),
      action: decision.action,
      ruleId: decision.ruleId,
    })
  )
}

console.log('== url policy ==')
const u1 = classifyUrl('https://res.cloudinary.com/demo/image/upload/x.png')
check('cloudinary trusted', u1?.trusted === true)
const u2 = classifyUrl('https://drive.google.com/file/d/abc123')
check('drive trusted', u2?.trusted === true)
const u3 = classifyUrl('https://docs.google.com/document/d/xyz')
check('docs trusted', u3?.trusted === true)
const u4 = classifyUrl('https://evil.example.com/payload')
check('evil untrusted', u4?.trusted === false)
const u5 = classifyUrl('www.facebook.com/profile')
check('www. normalized + untrusted', u5 !== null && u5.host === 'www.facebook.com' && u5.trusted === false)
const u6 = classifyUrl('https://sub.res.cloudinary.com/x')
check('subdomain of trusted is trusted', u6?.trusted === true)
const u7 = extractUrlFindings('body', 'Watch https://evil.example.com/x now.')
check('trailing period trimmed', u7.length === 1 && u7[0].host === 'evil.example.com')
const u8 = extractUrlFindings('body', 'Share via www.bit.ly/abc123 please')
check('www. extracted from prose', u8.length === 1 && u8[0].trusted === false)
const u9 = extractUrlFindings('body', 'no urls here, just 3.14 and i.e. examples')
check('no false URL extraction', u9.length === 0)
// deceptive hosts (reviewer technical check): a trusted domain as an infix
// or a lookalike prefix must NOT inherit trust — suffix matching is
// dot-boundary anchored
const u10 = classifyUrl('https://drive.google.com.evil.io/file/d/abc')
check('trusted-domain-infix host untrusted', u10 !== null && u10.trusted === false)
const u11 = classifyUrl('https://fakedrive.google.com/file/d/abc')
check('lookalike-prefix host untrusted', u11 !== null && u11.trusted === false)

console.log('== policy decisions ==')
const d1 = decide('announcement', [], [], [])
check('clean pass allows', d1.action === 'allow' && d1.ruleId === null)
const f1 = scanText('title', 'Gago ka ba')
const d2 = decide('announcement', f1.findings, [], [])
check('profanity flags', d2.action === 'flag' && d2.ruleId === 'profanity')
const f2 = scanText('title', 'n1gger')
const d3 = decide('announcement', f2.findings, [], [])
check('harassment rejects', d3.action === 'reject' && d3.ruleId === 'harassment')
const f3 = scanText('title', 'p0rn')
const d4 = decide('announcement', f3.findings, [], [])
check('sexual rejects', d4.action === 'reject' && d4.ruleId === 'sexual')
const mixed = [...scanText('t', 'Gago ka naman').findings, ...scanText('t', 'hentai').findings]
const d5 = decide('announcement', mixed, [], [])
check('mixed: sexual outranks profanity', d5.action === 'reject' && d5.ruleId === 'sexual')
const urlFinding = classifyUrl('https://bit.ly/xyz')
const d6 = decide('material-link', [], urlFinding ? [{ field: 'url', ...urlFinding }] : [], [])
check('untrusted link flags on material-link', d6.action === 'flag' && d6.ruleId === 'url-restriction')

// contextual review path (reviewer verdict recommendations B + D)
const fBio = scanText('title', 'Biology: the penis and vagina diagram')
const d7 = decide('announcement', fBio.findings, [], [])
check('contextual anatomy flags (not reject)', d7.action === 'flag' && d7.ruleId === 'sexual')
const fMixedSexual = scanText('title', 'blowjob next to the penis diagram')
const d8 = decide('announcement', fMixedSexual.findings, [], [])
check('contextual + clear sexual still rejects as sexual', d8.action === 'reject' && d8.ruleId === 'sexual')
const fCrossHarass = [...scanText('t', 'Tsekwa ka ba').findings, ...scanText('t', 'Nognog tale').findings]
const d9 = decide('announcement', fCrossHarass, [], [])
check('clear harassment + contextual harassment rejects as harassment', d9.action === 'reject' && d9.ruleId === 'harassment')
const fCrossSexual = [...scanText('t', 'hentai link').findings, ...scanText('t', 'Unano at Higante storybook').findings]
const d10 = decide('announcement', fCrossSexual, [], [])
check('clear sexual + contextual harassment rejects as sexual', d10.action === 'reject' && d10.ruleId === 'sexual')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
