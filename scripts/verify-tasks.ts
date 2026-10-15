// Quick verification script — checks the seeded tasks for the
// submissionsClosed flag and the expected counts.
import { MongoClient } from 'mongodb'
import { config } from 'dotenv'

// Load .env.local into process.env (silent if file is missing)
config({ path: '.env.local' })

const uri = process.env.MONGODB_URI!

async function verify() {
  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db('aics_portal')

  const tasks = await db.collection('tasks').find({
    branch: 'commonwealth',
    studentUsername: 'juan.santos',
    'term.academicYear': '2026-2027',
    'term.semester': '1st Sem',
  }).toArray()

  console.log(`\n=== Current-term tasks: ${tasks.length} ===\n`)

  // Group by subject
  const bySubject = new Map()
  for (const t of tasks) {
    if (!bySubject.has(t.subjectCode)) bySubject.set(t.subjectCode, [])
    bySubject.get(t.subjectCode).push(t)
  }

  for (const [code, list] of bySubject) {
    console.log(`\n--- ${code} (${list.length} tasks) ---`)
    for (const t of list) {
      const sc = t.submissionsClosed === true ? 'CLOSED' : 'open'
      const score = t.score !== null && t.score !== undefined ? `${t.score}/${t.maxScore}` : 'no score'
      const sub = t.submitted ? 'submitted' : 'not submitted'
      const overdue = new Date(t.dueDate) < new Date() ? 'OVERDUE' : 'future'
      console.log(`  ${t.title}`)
      console.log(`    submissions=${sc} | ${sub} | ${score} | due=${new Date(t.dueDate).toISOString().slice(0,10)} (${overdue})`)
    }
  }

  // Expected counts
  let graded = 0, pending = 0, missingClosed = 0, missingOpen = 0, needsAttention = 0
  for (const t of tasks) {
    if (t.score !== null) { graded++; continue }
    if (t.submitted) { pending++; continue }
    if (t.submissionsClosed === true) { missingClosed++; continue }
    if (new Date(t.dueDate) < new Date()) { missingOpen++; continue }
    needsAttention++
  }

  console.log(`\n=== Counts ===`)
  console.log(`Total: ${tasks.length}`)
  console.log(`Graded: ${graded}`)
  console.log(`Pending: ${pending}`)
  console.log(`Missing (closed): ${missingClosed}`)
  console.log(`Missing (open/overdue): ${missingOpen}`)
  console.log(`Needs attention: ${needsAttention}`)
  console.log(`Total Missing: ${missingClosed + missingOpen}`)

  console.log(`\nExpected: Total=11, Graded=4, Pending=2, Missing=2 (1 closed + 1 open), Needs=3`)
  console.log(`Needs Attention card rows = ${missingClosed + missingOpen + needsAttention} (should be 5)`)

  await client.close()
}

verify().catch((e) => { console.error(e); process.exit(1) })
