#!/usr/bin/env bash
# ============================================================
#  verify-moderation.sh — end-to-end verification for the
#  Content Moderation epic (docs/moderation-library-vetting.md §8.3)
#
#  Runs in ONE invocation because background processes do not
#  survive between shell sessions in this environment:
#
#    1. engine corpus gate: scripts/moderation-smoke.ts —
#       clean corpus (school announcements, subject titles,
#       Filipino names and food, code-switched sentences, the
#       known false-positive traps) must flag ZERO; dirty corpus
#       (bilingual profanity, inflected forms, leet, separator-
#       hidden, URLs) must ALL be caught; URL policy and the
#       reject-vs-flag decision table must hold
#    2. boot a throwaway local mongod + seed + `next start`
#    3. route-level enforcement — a crafted direct API call must
#       never persist flagged content:
#         announcements POST/PATCH (admin),
#         section notifications POST (faculty),
#         tasks POST (faculty),
#         materials link POST (faculty, trusted vs untrusted host),
#         profile PATCH (student)
#       each: dirty write -> 422 naming the rule; clean write -> ok
#    4. moderation_logs audit rows exist with rule ids, actions,
#       reviewPending flags and actor stamps
#
#  Requires: db/mongodb-linux-x86_64-debian12-8.0.12/, node_modules,
#  a production build (.next from `next build`), bun for the corpus.
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="http://127.0.0.1:3112"
MONGO_BIN="db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"
export MONGODB_URI=mongodb://127.0.0.1:27017
export MONGODB_DB=aics_portal
export AUTH_SECRET=local-dev-secret-aics-portal-moderation-2026
MONGO_PID=""; DEV_PID=""
PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

trap '
  [ -n "$DEV_PID" ]  && kill "$DEV_PID"  2>/dev/null || true
  [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
  true
' EXIT

jget() { # jget '<json>' '<node expr on d>' -> prints value
  node -e "const d=JSON.parse(process.argv[1]);console.log(eval(process.argv[2]))" "$1" "$2" 2>/dev/null || echo ''
}

# ------------------------------------------------------------
echo "== 1. engine corpus gate (scripts/moderation-smoke.ts) =="
SMOKE=$(bun scripts/moderation-smoke.ts 2>&1 | tail -1)
if echo "$SMOKE" | grep -q "0 failed"; then
  ok "corpus: $SMOKE (clean flags zero, dirty all caught, policy table holds)"
else
  bad "corpus gate: $SMOKE"
  exit 1
fi

# ------------------------------------------------------------
echo "== 2. boot mongod + seed =="
"$MONGO_BIN" --dbpath db/data --port 27017 --bind_ip 127.0.0.1 --quiet > db/mongod.log 2>&1 &
MONGO_PID=$!
for _ in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && break
  sleep 1
done
if kill -0 "$MONGO_PID" 2>/dev/null; then ok "mongod up (pid $MONGO_PID)"; else bad "mongod did not start"; exit 1; fi

node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();await c.db('aics_portal').dropDatabase().catch(()=>{});await c.close()})()"
if node scripts/seed-mongodb.ts > db/seed.log 2>&1; then
  ok "seed completed"
else
  bad "seed failed"; tail -5 db/seed.log; exit 1
fi

# ------------------------------------------------------------
echo "== 3. boot next start =="
node_modules/.bin/next start -p 3112 > db/dev.log 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/" && break
  sleep 1
done
if curl -sf -o /dev/null "$BASE/"; then ok "server up ($BASE)"; else bad "server did not start (db/dev.log)"; tail -20 db/dev.log; exit 1; fi

# ------------------------------------------------------------
echo "== 4. sessions =="
ADMIN_TOKEN=$(node scripts/mint-session.mjs admin admin commonwealth)
FACULTY_TOKEN=$(node scripts/mint-session.mjs m.reyes faculty commonwealth)
STUDENT_TOKEN=$(node scripts/mint-session.mjs juan.santos student commonwealth)
AC="Cookie: aics_session=$ADMIN_TOKEN"
FC="Cookie: aics_session=$FACULTY_TOKEN"
SC="Cookie: aics_session=$STUDENT_TOKEN"
[ -n "$ADMIN_TOKEN" ] && [ -n "$FACULTY_TOKEN" ] && [ -n "$STUDENT_TOKEN" ] && ok "minted admin + faculty + student sessions" || bad "session minting failed"

# expect422 <label> <cookie> <method> <url> <json> <rule> <action>
expect422() {
  local label="$1" cookie="$2" method="$3" url="$4" json="$5" rule="$6" action="$7"
  local body st
  body=$(curl -s -w '\n%{http_code}' -X "$method" -H "$cookie" -H 'Content-Type: application/json' -d "$json" "$BASE$url")
  st=$(echo "$body" | tail -1)
  body=$(echo "$body" | head -1)
  if [ "$st" = "422" ] && [ "$(jget "$body" "d.rule")" = "$rule" ] && [ "$(jget "$body" "d.action")" = "$action" ] && [ "$(jget "$body" "d.ok")" = "false" ]; then
    ok "$label -> 422 rule=$rule action=$action"
  else
    bad "$label -> status=$st body=$body"
  fi
}

# expectOK <label> <cookie> <method> <url> <json>
expectOK() {
  local label="$1" cookie="$2" method="$3" url="$4" json="$5"
  local body st
  body=$(curl -s -w '\n%{http_code}' -X "$method" -H "$cookie" -H 'Content-Type: application/json' -d "$json" "$BASE$url")
  st=$(echo "$body" | tail -1)
  body=$(echo "$body" | head -1)
  if [ "$st" = "200" ] && [ "$(jget "$body" "d.ok")" = "true" ]; then
    ok "$label -> persisted"
  else
    bad "$label -> status=$st body=$body"
  fi
}

# ------------------------------------------------------------
echo "== 5. announcements (admin) =="
expect422 "announcement: Filipino profanity" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Notice","body":"Gago ang lahat ng sumali ngayong Lingo.","category":"campus"}' profanity flag
expect422 "announcement: harassment slur" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Warning","body":"Chinks are not welcome at the event.","category":"campus"}' harassment reject
expect422 "announcement: sexual content" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Share","body":"hentai links in the group chat only.","category":"campus"}' sexual reject
expect422 "announcement: contextual anatomy flags (not reject)" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Biology","body":"Biology worksheet: label the penis and vagina on the reproductive system diagram.","category":"academic"}' sexual flag
expect422 "announcement: contextual folk-tale flags (not reject)" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Reading","body":"Philippine Literature: the tale of Nognog and the seven-headed dragon.","category":"academic"}' harassment flag
expect422 "announcement: separator-hidden evasion" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Deadline","body":"what the f u c k is this deadline change.","category":"deadline"}' profanity flag
expect422 "announcement: leet Filipino" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Class","body":"b0bo ng section natin sa math.","category":"academic"}' profanity flag
expectOK "announcement: clean analysis sentence" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Data analysis workshop","body":"Data analysis workshop in the computer laboratory this Friday.","category":"academic"}'
expectOK "announcement: clean Filipino food sentence" "$AC" POST /api/announcements \
  '{"branch":"commonwealth","title":"Canteen","body":"Ang gatas at tinapay ay para sa almusal tuwing umaga.","category":"campus"}'

anns=$(curl -s -H "$AC" "$BASE/api/announcements?username=admin&all=1")
AID=$(jget "$anns" "(d.announcements.find(x=>x.title==='Library extended hours during exam week')||{})._id || ''")
if [ -n "$AID" ]; then
  expect422 "announcement PATCH: dirty title on existing post" "$AC" PATCH /api/announcements \
    "{\"id\":\"$AID\",\"title\":\"Gago ka ba?\",\"body\":\"Edited body for the moderation check.\",\"category\":\"general\"}" profanity flag
else
  bad "announcement PATCH: seeded post not found for edit test"
fi

# ------------------------------------------------------------
echo "== 6. section notifications (faculty) =="
expect422 "notification: profanity body" "$FC" POST /api/notifications \
  '{"branch":"commonwealth","title":"Reminder","body":"Gago mga late sa submission bukas.","sectionKeys":["CS 208|2026-2027|1st Sem"]}' profanity flag
expectOK "notification: clean body" "$FC" POST /api/notifications \
  '{"branch":"commonwealth","title":"Lab reminder","body":"Bring your calculators for the CS 208 laboratory session tomorrow.","sectionKeys":["CS 208|2026-2027|1st Sem"]}'

# ------------------------------------------------------------
echo "== 7. tasks (faculty) =="
expect422 "task: dirty description" "$FC" POST /api/tasks \
  '{"branch":"commonwealth","subjectCode":"CS 208","title":"Quiz 3","type":"Quiz","description":"Ipasa ang sagot, gago kayong lahat.","maxScore":50,"dueDate":"2026-11-20"}' profanity flag
expectOK "task: clean description" "$FC" POST /api/tasks \
  '{"branch":"commonwealth","subjectCode":"CS 208","title":"Quiz 3","type":"Quiz","description":"Coverage: Systems Administration chapters 1 to 3.","maxScore":50,"dueDate":"2026-11-21"}'

# ------------------------------------------------------------
echo "== 8. materials link (faculty) =="
expect422 "material: untrusted link host" "$FC" POST /api/materials \
  '{"branch":"commonwealth","subjectCode":"CS 208","title":"External reference","kind":"link","url":"https://example.com/notes.pdf"}' url-restriction flag
expectOK "material: trusted Google Drive link" "$FC" POST /api/materials \
  '{"branch":"commonwealth","subjectCode":"CS 208","title":"Reading list","kind":"link","url":"https://drive.google.com/file/d/abc123/view"}'

# ------------------------------------------------------------
echo "== 9. profile (student) =="
expect422 "profile: dirty address" "$SC" PATCH "/api/student/update?username=juan.santos" \
  '{"address":"Putang ina ng street namin sa QC"}' profanity flag
expectOK "profile: clean address" "$SC" PATCH "/api/student/update?username=juan.santos" \
  '{"address":"12 Commonwealth Avenue, Quezon City"}'

# ------------------------------------------------------------
echo "== 10. moderation_logs audit rows =="
LOGS=$(node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();const col=c.db('aics_portal').collection('moderation_logs');const all=await col.find({}).toArray();await c.close();const has=all.some(x=>x.ruleId==='profanity'&&x.action==='flag'&&x.reviewPending===true);const rej=all.some(x=>x.ruleId==='harassment'&&x.action==='reject');const sex=all.some(x=>x.ruleId==='sexual'&&x.action==='reject');const ctx=all.some(x=>x.ruleId==='sexual'&&x.action==='flag'&&x.reviewPending===true);const url=all.some(x=>x.ruleId==='url-restriction'&&Array.isArray(x.urls)&&x.urls.length>0);const actor=all.some(x=>x.actorUsername==='m.reyes'||x.actorUsername==='juan.santos');const excerpt=all.every(x=>typeof x.textExcerpt==='string'&&x.textExcerpt.length>0);const surfs=new Set(all.map(x=>x.surface));console.log(JSON.stringify({n:all.length,has,rej,sex,ctx,url,actor,excerpt,surfs:[...surfs]}))})()")
res=$(node -e "const d=JSON.parse(process.argv[1]);const c=[d.n>0,d.has,d.rej,d.sex,d.ctx,d.url,d.actor,d.excerpt,d.surfs.includes('announcement'),d.surfs.includes('section-notification'),d.surfs.includes('task'),d.surfs.includes('material-link'),d.surfs.includes('profile')];console.log(c.every(Boolean)?'OK':'BAD '+process.argv[1])" "$LOGS")
[ "$res" = "OK" ] && ok "moderation_logs: rule ids, actions, reviewPending (incl. contextual sexual flag), urls, actors, excerpts, all 5 surfaces" || bad "moderation_logs: $res"

# ------------------------------------------------------------
echo ""
echo "== RESULT: $PASS passed, $FAIL failed =="
[ "$FAIL" = "0" ] || exit 1
