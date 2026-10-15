#!/usr/bin/env bash
# ============================================================
#  verify-admin-portal.sh — end-to-end verification for the
#  admin portal epic (dashboard stats, events CRUD, announcements
#  CRUD, professors CRUD, people directory, enrollment management)
#
#  Runs in ONE invocation because background processes do not
#  survive between shell sessions in this environment:
#
#    1. boot a throwaway local mongod (db/data)
#    2. reset + seed aics_portal
#    3. boot `next start` (production build, port 3111)
#    4. API checks: 401/403 gates, admin stats shape, full CRUD
#       cycles for events/announcements/professors, enrollment
#       step override + payment posting + overpay rejection
#    5. re-seed so the browser pass sees pristine data
#    6. browser flow via agent-browser: login as admin, every
#       admin page, UI event creation, UI payment posting, 375px
#       overflow check
#
#  Evidence screenshots land in docs/done/qa_evidence/ui-ux/.
#  Requires: db/mongodb-linux-x86_64-debian12-8.0.12/, node_modules,
#  a production build (.next from `next build`).
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="http://127.0.0.1:3111"
MONGO_BIN="db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"
export MONGODB_URI=mongodb://127.0.0.1:27017
export MONGODB_DB=aics_portal
export AUTH_SECRET=local-dev-secret-aics-portal-admin-work-2026
export CLOUDINARY_CLOUD_NAME=verify-fake-cloud
export CLOUDINARY_API_KEY=123456789012345
export CLOUDINARY_API_SECRET=local-verification-fake-secret
MONGO_PID=""; DEV_PID=""
PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

trap '
  agent-browser close >/dev/null 2>&1 || true
  [ -n "$DEV_PID" ]  && kill "$DEV_PID" 2>/dev/null || true
  [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
  true
' EXIT

# ------------------------------------------------------------
echo "== 1. boot mongod =="
"$MONGO_BIN" --dbpath db/data --port 27017 --bind_ip 127.0.0.1 --quiet > db/mongod.log 2>&1 &
MONGO_PID=$!
for _ in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && break
  sleep 1
done
if kill -0 "$MONGO_PID" 2>/dev/null; then ok "mongod up (pid $MONGO_PID)"; else bad "mongod did not start"; exit 1; fi

reset_seed() {
  node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();await c.db('aics_portal').dropDatabase().catch(()=>{});await c.close()})()"
  if MONGODB_URI=mongodb://127.0.0.1:27017 MONGODB_DB=aics_portal node scripts/seed-mongodb.ts > db/seed.log 2>&1; then
    return 0
  else
    tail -5 db/seed.log
    return 1
  fi
}

# ------------------------------------------------------------
echo "== 2. reset + seed =="
if reset_seed; then ok "seed completed"; else bad "seed failed"; exit 1; fi

# ------------------------------------------------------------
echo "== 3. boot next start =="
node_modules/.bin/next start -p 3111 > db/dev.log 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/" && break
  sleep 1
done
if curl -sf -o /dev/null "$BASE/"; then ok "server up ($BASE)"; else bad "server did not start (db/dev.log)"; tail -20 db/dev.log; exit 1; fi

# ------------------------------------------------------------
echo "== 4. unauthenticated API gates =="
for path in "/api/admin/stats" "/api/admin/people" "/api/admin/enrollment"; do
  st=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$path")
  [ "$st" = "401" ] && ok "$path without session -> 401" || bad "$path without session -> $st"
done
st=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"title":"x","date":"2026-11-01","category":"campus"}' "$BASE/api/events")
[ "$st" = "401" ] && ok "POST /api/events without session -> 401" || bad "POST /api/events without session -> $st"
st=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -H 'Content-Type: application/json' -d '{"id":"000000000000000000000000","title":"x","body":"y","category":"general"}' "$BASE/api/announcements")
[ "$st" = "401" ] && ok "PATCH /api/announcements without session -> 401" || bad "PATCH /api/announcements without session -> $st"

# ------------------------------------------------------------
echo "== 5. sessions =="
ADMIN_TOKEN=$(node scripts/mint-session.mjs admin admin commonwealth)
STUDENT_TOKEN=$(node scripts/mint-session.mjs juan.santos student commonwealth)
AC="Cookie: aics_session=$ADMIN_TOKEN"
SC="Cookie: aics_session=$STUDENT_TOKEN"
[ -n "$ADMIN_TOKEN" ] && [ -n "$STUDENT_TOKEN" ] && ok "minted admin + student sessions" || bad "session minting failed"

# ------------------------------------------------------------
echo "== 6. role gate: student session on admin endpoints =="
for path in "/api/admin/stats" "/api/admin/people" "/api/admin/enrollment"; do
  st=$(curl -s -o /dev/null -w '%{http_code}' -H "$SC" "$BASE$path")
  [ "$st" = "403" ] && ok "student on $path -> 403" || bad "student on $path -> $st"
done
st=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$SC" -H 'Content-Type: application/json' -d '{"title":"x","date":"2026-11-01","category":"campus"}' "$BASE/api/events")
[ "$st" = "403" ] && ok "student POST /api/events -> 403" || bad "student POST /api/events -> $st"
st=$(curl -s -o /dev/null -w '%{http_code}' -H "$SC" "$BASE/api/announcements?username=juan.santos&all=1")
[ "$st" = "403" ] && ok "student GET announcements all=1 -> 403" || bad "student GET announcements all=1 -> $st"

# ------------------------------------------------------------
echo "== 7. admin stats =="
stats=$(curl -s -H "$AC" "$BASE/api/admin/stats")
res=$(node -e "const d=JSON.parse(process.argv[1]);const s=d.stats;const c=[d.ok===true,s.totals.students===75,s.totals.faculty===1,s.totals.branches===1,s.gpa.withGpa===3,s.gpa.deanListers===0,s.finances.totalAssessment===32750,s.finances.totalPaid===20000,s.finances.totalBalance===12750,s.branches.length===1&&s.branches[0].branchName==='AICS Commonwealth',Array.isArray(s.upcomingEvents),Array.isArray(s.recentAnnouncements)&&s.recentAnnouncements.length===5];console.log(c.every(Boolean)?'OK':'BAD '+JSON.stringify({students:s.totals.students,faculty:s.totals.faculty,withGpa:s.gpa.withGpa,dean:s.gpa.deanListers,fin:s.finances,br:s.branches}))" "$stats")
[ "$res" = "OK" ] && ok "stats: 75 students, 1 faculty, 1 branch, GPA over 3 students, ₱32,750 assessed / ₱20,000 paid / ₱12,750 balance" || bad "stats shape: $res"

# ------------------------------------------------------------
echo "== 8. people directory =="
people=$(curl -s -H "$AC" "$BASE/api/admin/people")
res=$(node -e "const d=JSON.parse(process.argv[1]);const c=[d.ok===true,d.counts.total===77,d.counts.students===75,d.counts.faculty===1,d.counts.admins===1,d.people.some(p=>p.username==='juan.santos'),d.people.some(p=>p.username==='m.reyes'&&p.role==='faculty'),!('password' in d.people[0])];console.log(c.every(Boolean)?'OK':'BAD '+JSON.stringify(d.counts))" "$people")
[ "$res" = "OK" ] && ok "people: 77 accounts (75/1/1), juan + m.reyes present, no password field" || bad "people: $res"

# ------------------------------------------------------------
echo "== 9. events CRUD cycle =="
created=$(curl -s -X POST -H "$AC" -H 'Content-Type: application/json' -d '{"title":"QA Verification Event","description":"Created by the admin portal harness","date":"2026-11-15","category":"academic"}' "$BASE/api/events")
EID=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.ok?d.id:'')" "$created")
[ -n "$EID" ] && ok "event created ($EID)" || bad "event create: $created"

st=$(curl -s -X PATCH -H "$AC" -H 'Content-Type: application/json' -d "{\"id\":\"$EID\",\"title\":\"QA Verification Event (edited)\",\"endDate\":\"2026-11-17\"}" "$BASE/api/events" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':s)})")
[ "$st" = "OK" ] && ok "event edited (title + multi-day range)" || bad "event edit: $st"

st=$(curl -s -H "$AC" "$BASE/api/events?username=admin" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);const e=d.events.find(x=>x._id===process.argv[1]);console.log(e&&e.title==='QA Verification Event (edited)'&&e.endDate?'OK':'BAD '+JSON.stringify(e))})" "$EID")
[ "$st" = "OK" ] && ok "edited event visible with endDate" || bad "event readback: $st"

st=$(curl -s -X PATCH -H "$AC" -H 'Content-Type: application/json' -d "{\"id\":\"$EID\",\"endDate\":\"2026-11-10\"}" "$BASE/api/events" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===false?'OK':s)})")
[ "$st" = "OK" ] && ok "end date before start rejected (400 logic)" || bad "range validation: $st"

st=$(curl -s -X DELETE -H "$AC" "$BASE/api/events?id=$EID" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':s)})")
[ "$st" = "OK" ] && ok "event deleted" || bad "event delete: $st"
st=$(curl -s -H "$AC" "$BASE/api/events?username=admin" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).events.some(x=>x._id===process.argv[1])?'BAD':'OK')})" "$EID")
[ "$st" = "OK" ] && ok "deleted event gone from list" || bad "event gone check: $st"

# ------------------------------------------------------------
echo "== 10. announcements CRUD cycle =="
anns=$(curl -s -H "$AC" "$BASE/api/announcements?username=admin&all=1")
res=$(node -e "const d=JSON.parse(process.argv[1]);const a=d.announcements.find(x=>x.title==='Enrollment deadline extended');console.log(d.ok===true&&d.announcements.length>=5&&a&&a.expiryDate?'OK':'BAD '+JSON.stringify({n:d.announcements.length,first:d.announcements[0]}))" "$anns")
[ "$res" = "OK" ] && ok "all=1 lists seeded posts with expiryDate" || bad "announcements all=1: $res"

AID=$(node -e "const d=JSON.parse(process.argv[1]);const a=d.announcements.find(x=>x.title==='Library extended hours during exam week');console.log(a?a._id:'')" "$anns")
st=$(curl -s -X PATCH -H "$AC" -H 'Content-Type: application/json' -d "{\"id\":\"$AID\",\"title\":\"Library extended hours (QA edit)\",\"body\":\"Edited by the harness.\",\"category\":\"campus\",\"priority\":\"urgent\"}" "$BASE/api/announcements" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':s)})")
[ "$st" = "OK" ] && ok "announcement edited" || bad "announcement edit: $st"

st=$(curl -s -X POST -H "$AC" -H 'Content-Type: application/json' -d '{"branch":"commonwealth","title":"QA harness post","body":"Temporary post.","category":"general","performedBy":"admin"}' "$BASE/api/announcements" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log(d.ok===true?d.id:s)})")
[ -n "$st" ] && ok "announcement posted (legacy POST contract)" || bad "announcement post: $st"
QA_AID="$st"

st=$(curl -s -X DELETE -H "$AC" "$BASE/api/announcements?id=$QA_AID" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':s)})")
[ "$st" = "OK" ] && ok "announcement deleted (+reads cleanup)" || bad "announcement delete: $st"

# ------------------------------------------------------------
echo "== 11. professors CRUD cycle =="
st=$(curl -s -X POST -H "$AC" -H 'Content-Type: application/json' -d '{"name":"QA Test Professor","email":"qa.test@aics.edu.ph","officeHours":"Fri • 1:00-3:00 PM","room":"Room 999"}' "$BASE/api/professors" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log(d.ok===true?d.id:s)})")
[ -n "$st" ] && ok "professor added" || bad "professor add: $st"
PID="$st"

st=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$AC" -H 'Content-Type: application/json' -d '{"name":"QA Test Professor","email":"other@aics.edu.ph"}' "$BASE/api/professors")
[ "$st" = "409" ] && ok "duplicate professor name -> 409" || bad "duplicate professor -> $st"

st=$(curl -s -X PATCH -H "$AC" -H 'Content-Type: application/json' -d "{\"id\":\"$PID\",\"room\":\"Room 998\"}" "$BASE/api/professors" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':s)})")
[ "$st" = "OK" ] && ok "professor patched (room only)" || bad "professor patch: $st"

st=$(curl -s -X DELETE -H "$AC" "$BASE/api/professors?id=$PID" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':s)})")
[ "$st" = "OK" ] && ok "professor removed" || bad "professor delete: $st"

# ------------------------------------------------------------
echo "== 12. enrollment override + payments =="
enr=$(curl -s -H "$AC" "$BASE/api/admin/enrollment")
res=$(node -e "const d=JSON.parse(process.argv[1]);const r=d.records&&d.records[0];console.log(d.ok===true&&d.records.length===1&&d.withoutRecords===74&&r&&r.studentUsername==='juan.santos'&&r.currentStep===3&&r.assessment.balance===12750?'OK':'BAD '+JSON.stringify({n:d.records.length,without:d.withoutRecords}))" "$enr")
[ "$res" = "OK" ] && ok "one record (juan), 74 students without records" || bad "enrollment list: $res"
RID=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.records[0]._id)" "$enr")

st=$(curl -s -X PATCH -H "$AC" -H 'Content-Type: application/json' -d "{\"id\":\"$RID\",\"currentStep\":4}" "$BASE/api/admin/enrollment" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':s)})")
[ "$st" = "OK" ] && ok "step tracker overridden 3 -> 4" || bad "override: $st"

st=$(curl -s -H "$AC" "$BASE/api/admin/enrollment" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).records[0];const steps=r.steps.map(x=>x.status).join(',');console.log(r.currentStep===4&&steps==='completed,completed,completed,current,upcoming'?'OK':'BAD '+steps)})")
[ "$st" = "OK" ] && ok "statuses recomputed (3 completed, current, upcoming)" || bad "status recompute: $st"

st=$(curl -s -X POST -H "$AC" -H 'Content-Type: application/json' -d "{\"id\":\"$RID\",\"amount\":5000,\"date\":\"2026-10-10\",\"note\":\"OR-QA-001\"}" "$BASE/api/admin/enrollment" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=JSON.parse(s);console.log(d.ok===true&&d.balance===7750&&d.paymentStatus==='partial'?'OK':s)})")
[ "$st" = "OK" ] && ok "payment ₱5,000 posted (balance 12,750 -> 7,750, partial)" || bad "payment post: $st"

st=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$AC" -H 'Content-Type: application/json' -d "{\"id\":\"$RID\",\"amount\":99999}" "$BASE/api/admin/enrollment")
[ "$st" = "400" ] && ok "overpayment rejected -> 400" || bad "overpayment -> $st"

st=$(curl -s -H "$AC" "$BASE/api/admin/enrollment" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s).records[0];console.log(r.payments.length===1&&r.payments[0].note==='OR-QA-001'&&r.payments[0].postedBy==='admin'&&r.assessment.amountPaid===25000?'OK':'BAD '+JSON.stringify(r.payments))})")
[ "$st" = "OK" ] && ok "payment audit trail recorded (postedBy admin)" || bad "payment trail: $st"

# ------------------------------------------------------------
echo "== 13. re-seed for pristine browser pass =="
if reset_seed; then ok "re-seeded"; else bad "re-seed failed"; fi

# ------------------------------------------------------------
echo "== 14. browser flow (agent-browser) =="
EVID="docs/done/qa_evidence/ui-ux"
AB="agent-browser"
NAV="$BASE/portal/commonwealth/admin/admin"
ev() { $AB eval "$1" 2>/dev/null | tr -d '"'; }

$AB open "$BASE/" > /dev/null
$AB wait --load networkidle > /dev/null 2>&1 || true
sleep 2
$AB find label "Username" fill "admin" > /dev/null
$AB find label "Password" fill "admin123" > /dev/null
$AB find text "Sign In" click > /dev/null
sleep 4
url=$($AB get url)
case "$url" in *"/portal/commonwealth/admin/admin"*) ok "admin login -> $url" ;; *) bad "login stuck at $url" ;; esac

# dashboard renders
for _ in $(seq 1 30); do $AB wait --text "Admin Dashboard" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
$AB wait --text "Admin Dashboard" --timeout 15000 > /dev/null 2>&1 || bad "dashboard heading never appeared"
sleep 2
res=$(ev "(function(){const t=document.body.textContent;return t.includes('75')&&t.includes('AICS Commonwealth')&&t.includes('GPA distribution')&&t.includes('Fee collection')&&t.includes('Branch overview')})()")
[ "$res" = "true" ] && ok "dashboard: stats cards, GPA chart, finances, branch table render" || bad "dashboard content incomplete"
$AB screenshot "$EVID/admin-01-dashboard.png" > /dev/null

# release queue still works
$AB open "$NAV/release-queue" > /dev/null
$AB wait --text "Release Queue" --timeout 15000 > /dev/null 2>&1
res=$(ev "(function(){return document.body.textContent.includes('Submitted grade periods awaiting release')})()")
[ "$res" = "true" ] && ok "release queue page renders" || bad "release queue missing"
$AB screenshot "$EVID/admin-02-release-queue.png" > /dev/null

# events page
$AB open "$NAV/events" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "Add event" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
$AB wait --text "Add event" --timeout 15000 > /dev/null 2>&1 || bad "events page never loaded"
res=$(ev "(function(){const t=document.body.textContent;return t.includes('Flag Ceremony')&&t.includes('All categories')})()")
[ "$res" = "true" ] && ok "events table lists seeded events with filters" || bad "events table incomplete"
$AB screenshot "$EVID/admin-03-events.png" > /dev/null

# UI: create an event through the modal
ev "(function(){const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('Add event'));if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
for _ in $(seq 1 10); do $AB wait --text "Start date" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
res=$(ev "(async()=>{const set=(id,v)=>{const i=document.getElementById(id);const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,v);i.dispatchEvent(new Event('input',{bubbles:true}))};set('event-title','Foundation Week Kickoff');set('event-date','2026-11-20');set('event-end-date','2026-11-21');return 'filled'})()")
[ "$res" = "filled" ] && ok "event modal filled (title + range)" || bad "event modal fill: $res"
$AB screenshot "$EVID/admin-04-event-modal.png" > /dev/null
ev "(function(){const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='Create event');if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
for _ in $(seq 1 15); do $AB wait --text "Event created." --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
res=$(ev "(function(){return document.body.textContent.includes('Foundation Week Kickoff')})()")
[ "$res" = "true" ] && ok "UI-created event appears in the table" || bad "UI event not in table"
$AB screenshot "$EVID/admin-05-event-created.png" > /dev/null

# announcements page
$AB open "$NAV/announcements" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "Post announcement" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
for _ in $(seq 1 30); do $AB wait --text "Enrollment deadline extended" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
sleep 2
res=$(ev "(function(){const t=document.body.textContent;return t.includes('Enrollment deadline extended')&&t.includes('Urgent')&&t.includes('Active + expired')})()")
[ "$res" = "true" ] && ok "announcements table lists posts with priority + expiry filters" || bad "announcements table incomplete"
$AB screenshot "$EVID/admin-06-announcements.png" > /dev/null

# professors page
$AB open "$NAV/professors" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "Add professor" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
res=$(ev "(function(){const t=document.body.textContent;return t.includes('Engr. Maria Cristina Reyes')&&t.includes('Faculty Office / Room 204')})()")
[ "$res" = "true" ] && ok "professors directory lists seeded entries" || bad "professors table incomplete"
$AB screenshot "$EVID/admin-07-professors.png" > /dev/null

# people page — chips + first page (m.reyes sorts before students)
$AB open "$NAV/people" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "Students & Faculty" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
for _ in $(seq 1 30); do $AB wait --text "m.reyes" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
sleep 2
res=$(ev "(function(){const t=document.body.textContent;return t.includes('Everyone')&&t.includes('75')&&t.includes('m.reyes')})()")
[ "$res" = "true" ] && ok "people directory: chips (75 students), faculty + admin rows on page 1" || bad "people content incomplete"
# search narrows to juan (who lives on page 2 without a query)
ev "(function(){const i=document.querySelector('input[type=search]');const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(i,'juan.santos');i.dispatchEvent(new Event('input',{bubbles:true}));return 'typed'})()" > /dev/null
for _ in $(seq 1 15); do $AB wait --text "juan.santos" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
sleep 1
res=$(ev "(function(){const t=document.body.textContent;return t.includes('Juan')&&t.includes('juan.santos')})()")
[ "$res" = "true" ] && ok "people search narrows to juan.santos" || bad "people search failed"
$AB screenshot "$EVID/admin-08-people.png" > /dev/null

# enrollment page
$AB open "$NAV/enrollment" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "Registrar view" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
sleep 2
res=$(ev "(function(){const t=document.body.textContent;return t.includes('juan.santos')&&t.includes('12,750')&&t.includes('Override')&&t.includes('Payment')})()")
[ "$res" = "true" ] && ok "enrollment row: juan, ₱12,750 balance, Override + Payment actions" || bad "enrollment row incomplete"
$AB screenshot "$EVID/admin-09-enrollment.png" > /dev/null

# UI: post the full balance through the payment modal
ev "(function(){const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='Payment');if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
for _ in $(seq 1 10); do $AB wait --text "Remaining balance" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
ev "(function(){const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('Full balance'));if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
sleep 1
$AB screenshot "$EVID/admin-10-payment-modal.png" > /dev/null
ev "(function(){const b=[...document.querySelectorAll('button')].find(x=>/^Post\s/.test((x.textContent||'').trim()));if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
for _ in $(seq 1 15); do $AB wait --text "Payment posted." --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
sleep 1
res=$(ev "(function(){return document.body.textContent.includes('Paid')})()")
[ "$res" = "true" ] && ok "UI payment posted; row shows Paid" || bad "payment via UI failed"
$AB screenshot "$EVID/admin-11-payment-paid.png" > /dev/null

# UI: override the step tracker back (4 -> 2) through the modal
ev "(function(){const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='Override');if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
for _ in $(seq 1 10); do $AB wait --text "Override step tracker" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
ev "(function(){const items=[...document.querySelectorAll('[aria-pressed]')];const target=items.find(x=>x.textContent.includes('Assessment'));if(target){target.click();return 'clicked'}return 'missing'})()" > /dev/null
sleep 1
ev "(function(){const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').includes('Set step'));if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
for _ in $(seq 1 15); do $AB wait --text "Step tracker set to" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
res=$(ev "(function(){const t=document.body.textContent;return t.includes('Step 2 of 5')&&t.includes('Assessment')})()")
[ "$res" = "true" ] && ok "UI override applied (current step now Assessment)" || bad "override via UI failed"
$AB screenshot "$EVID/admin-12-override.png" > /dev/null

# 375px overflow checks across every admin page (house mobile
# standard: documentElement must not scroll sideways; tables inside
# overflow-x-auto scrollers are clipped by design, not offenders)
$AB set viewport 375 812 > /dev/null
for page in "" "/release-queue" "/events" "/announcements" "/professors" "/people" "/enrollment"; do
  $AB open "$NAV$page" > /dev/null
  sleep 2
  res=$(ev "(function(){const d=document.documentElement;return d.scrollWidth - d.clientWidth})()")
  label=${page:-/dashboard}
  [ "$res" = "0" ] && ok "375px $label: zero page-level overflow" || bad "375px $label overflow: ${res}px"
done
$AB screenshot "$EVID/admin-13-dashboard-375px.png" > /dev/null
$AB set viewport 1280 800 > /dev/null
sleep 1

# ------------------------------------------------------------
echo ""
echo "== summary: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
