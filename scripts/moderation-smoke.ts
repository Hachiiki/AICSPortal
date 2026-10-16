// Sandbox smoke test for the moderation engine (not committed).
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

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
