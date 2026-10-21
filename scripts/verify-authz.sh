#!/usr/bin/env bash
# ============================================================
#  verify-authz.sh — authorization characterization runbook
#  (docs/authz/ phase 4 stage 0; see phase-3-plan.md section 4)
#
#  Records and replays the CURRENT behavior of every protected
#  endpoint for a fixed six-actor cast, including the confirmed
#  vulnerabilities (rows noted "CURRENTLY PERMITS" flip at their
#  stage 3 fix commit; the commit shows the goldens.tsv diff).
#
#  One invocation, because background processes do not survive
#  between shell sessions in this environment:
#    1. boot a throwaway mongod (db/data, sibling db/ or ../db/)
#    2. drop + seed aics_portal (seed includes the authz cast)
#    3. build (unless SKIP_BUILD=1) and `next start` on port 3113
#    4. mint the cast sessions with scripts/mint-session.mjs
#    5. run the scenario matrix, asserting status + body tokens
#       against docs/authz/goldens.tsv
#
#  Usage:
#    bash scripts/verify-authz.sh              # verify against goldens
#    bash scripts/verify-authz.sh --update     # regenerate goldens.tsv
#    SKIP_BUILD=1 bash scripts/verify-authz.sh # reuse an existing .next
#
#  CRON_SECRET is set from C3.6 on (FIX-M3): the proxy admits the
#  cleanup path when the Bearer secret matches, so CRON-RIGHT-BEARER
#  runs the cleanup (200). The wrong-secret and no-bearer rows stay
#  401; the unset-secret world was pinned at baseline (all 401).
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="http://127.0.0.1:3113"
GOLDENS="docs/authz/goldens.tsv"
UPDATE=0
[ "${1:-}" = "--update" ] && UPDATE=1

export MONGODB_URI=mongodb://127.0.0.1:27017
export MONGODB_DB=aics_portal
export AUTH_SECRET=local-dev-secret-aics-portal-authz-2026
export CLOUDINARY_CLOUD_NAME=verify-fake-cloud
export CLOUDINARY_API_KEY=123456789012345
export CLOUDINARY_API_SECRET=local-verification-fake-secret
export CRON_SECRET=authz-cron-test-secret

# mongod lives outside the worktree when run from .dev-wt
MONGO_BIN="${MONGO_BIN:-}"
if [ -z "$MONGO_BIN" ]; then
  for cand in "./db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod" "../db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"; do
    [ -x "$cand" ] && MONGO_BIN="$cand" && break
  done
fi
MONGO_ROOT="$(cd "$(dirname "$MONGO_BIN")/.." && pwd)"
DATA_DIR="$MONGO_ROOT/data"
LOG_DIR="$MONGO_ROOT"
BODY_FILE="$LOG_DIR/authz-body.json"
[ -d "$DATA_DIR" ] || mkdir -p "$DATA_DIR"

PASS=0; FAIL=0; ROWS_RUN=0
MONGO_PID=""; DEV_PID=""
DEFS=()   # TSV row definitions, rebuilt every run
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

trap '
  [ -n "$DEV_PID" ]  && kill "$DEV_PID" 2>/dev/null || true
  [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
  true
' EXIT

cookie_for() {
  case "$1" in
    none)      printf '' ;;
    studentA)  printf 'Cookie: aics_session=%s' "$T_STU_A" ;;
    studentB)  printf 'Cookie: aics_session=%s' "$T_STU_B" ;;
    studentC)  printf 'Cookie: aics_session=%s' "$T_STU_C" ;;
    studentD)  printf 'Cookie: aics_session=%s' "$T_STU_D" ;;
    facultyX)  printf 'Cookie: aics_session=%s' "$T_FAC_X" ;;
    facultyY)  printf 'Cookie: aics_session=%s' "$T_FAC_Y" ;;
    admin)     printf 'Cookie: aics_session=%s' "$T_ADMIN" ;;
    admin2)    printf 'Cookie: aics_session=%s' "$T_ADMIN2" ;;
    staleFac)  printf 'Cookie: aics_session=%s' "$T_STALE" ;;
    staleAdm)  printf 'Cookie: aics_session=%s' "$T_STALE_ADM" ;;
    *)         printf '' ;;
  esac
}

# check body tokens: "contains:X;;!contains:Y"
check_body() {
  local tokens="$1" verdict=0
  [ -z "$tokens" ] || [ "$tokens" = "-" ] && return 0
  local IFS_BAK="$IFS"
  IFS=';;'
  read -r -a arr <<< "$tokens" 2>/dev/null || arr=("$tokens")
  IFS="$IFS_BAK"
  local t
  for t in "${arr[@]}"; do
    [ -z "$t" ] && continue
    case "$t" in
      "contains:"*)
        grep -qF "${t#contains:}" "$BODY_FILE" || { echo "    body missing: ${t#contains:}"; verdict=1; } ;;
      "!contains:"*)
        grep -qF "${t#!contains:}" "$BODY_FILE" && { echo "    body unexpectedly contains: ${t#!contains:}"; verdict=1; } ;;
    esac
  done
  return $verdict
}

# sc <id> <actor> <method> <target> <precondition> <body|-> <extraHeader|->
#     <asserts|-> <note>
sc() {
  local id="$1" actor="$2" method="$3" target="$4" precond="$5" body="${6:-}" extra="${7:-}"
  local asserts="${8:-}" note="${9:-}"
  DEFS+=("$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' "$id" "$actor" "$method" "$target" "$precond" "$body" "$asserts" "$note")")
  local hdr; hdr=$(cookie_for "$actor")
  local args=(-s -o "$BODY_FILE" -w '%{http_code}' --max-time 20)
  [ -n "$hdr" ] && args+=(-H "$hdr")
  [ -n "$extra" ] && [ "$extra" != "-" ] && args+=(-H "$extra")
  case "$method" in
    GET) ;;
    DELETE) args+=(-X DELETE) ;;
    *) args+=(-X "$method" -H 'Content-Type: application/json'); [ -n "$body" ] && [ "$body" != "-" ] && args+=(--data-raw "$body") ;;
  esac
  local status
  status=$(curl "${args[@]}" "$BASE$target" 2>/dev/null || echo 000)
  ROWS_RUN=$((ROWS_RUN+1))

  if [ "$UPDATE" = 1 ]; then
    printf '%s\t%s\n' "$id" "$status" >> "$LOG_DIR/authz-actuals.tsv"
    printf '  RUN   %-28s %s\n' "$id" "$status"
    return
  fi

  local exp
  exp=$(awk -F'\t' -v id="$id" '$1==id{print $6}' "$GOLDENS" 2>/dev/null)
  if [ -z "$exp" ]; then bad "$id: no golden row (run --update first)"; return; fi
  if [ "$exp" != "$status" ]; then bad "$id: expected $exp, got $status"; return; fi
  if ! check_body "$asserts"; then bad "$id: body assertion failed"; return; fi
  ok "$id -> $status"
}

# ------------------------------------------------------------
echo "== 1. boot mongod =="
"$MONGO_BIN" --dbpath "$DATA_DIR" --port 27017 --bind_ip 127.0.0.1 --quiet > "$LOG_DIR/mongod-authz.log" 2>&1 &
MONGO_PID=$!
for _ in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && break
  sleep 1
done
if kill -0 "$MONGO_PID" 2>/dev/null; then ok "mongod up (pid $MONGO_PID)"; else bad "mongod did not start"; tail -5 "$LOG_DIR/mongod-authz.log"; exit 1; fi

# ------------------------------------------------------------
echo "== 2. reset + seed =="
node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();await c.db('aics_portal').dropDatabase().catch(()=>{});await c.close()})()"
if MONGODB_URI=mongodb://127.0.0.1:27017 MONGODB_DB=aics_portal node --experimental-strip-types scripts/seed-mongodb.ts > "$LOG_DIR/seed-authz.log" 2>&1; then
  ok "seed completed (authz cast included)"
else
  bad "seed failed"; tail -8 "$LOG_DIR/seed-authz.log"; exit 1
fi

# ------------------------------------------------------------
echo "== 3. build + boot next start =="
if [ "${SKIP_BUILD:-0}" != "1" ] || [ ! -f .next/BUILD_ID ]; then
  echo "  building (next build)..."
  if ! node_modules/.bin/next build > "$LOG_DIR/build-authz.log" 2>&1; then
    bad "next build failed"; tail -25 "$LOG_DIR/build-authz.log"; exit 1
  fi
  ok "build completed"
else
  echo "  SKIP_BUILD=1, reusing .next"
fi
node_modules/.bin/next start -p 3113 > "$LOG_DIR/dev-authz.log" 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/" && break; sleep 1; done
if curl -sf -o /dev/null "$BASE/"; then ok "server up ($BASE)"; else bad "server did not start"; tail -20 "$LOG_DIR/dev-authz.log"; exit 1; fi

# ------------------------------------------------------------
echo "== 4. mint the cast =="
T_STU_A=$(node scripts/mint-session.mjs juan.santos student commonwealth)
T_STU_B=$(node scripts/mint-session.mjs maria.cruz student commonwealth)
T_STU_C=$(node scripts/mint-session.mjs a.castillo student commonwealth)
T_STU_D=$(node scripts/mint-session.mjs b.mendoza student commonwealth)
T_FAC_X=$(node scripts/mint-session.mjs m.reyes faculty commonwealth)
T_FAC_Y=$(node scripts/mint-session.mjs l.bautista faculty commonwealth)
T_ADMIN=$(node scripts/mint-session.mjs admin admin commonwealth)
T_ADMIN2=$(node scripts/mint-session.mjs admin2 admin novaliches)
T_STALE=$(node scripts/mint-session.mjs maria.cruz faculty commonwealth)
T_STALE_ADM=$(node scripts/mint-session.mjs maria.cruz admin commonwealth)
[ -n "$T_STU_A" ] && [ -n "$T_FAC_Y" ] && ok "minted 10 sessions (6 cast + 2 stale-role probes)" || bad "session minting failed"

# dynamic ids for later rows
TID=$(curl -s -H "Cookie: aics_session=$T_STU_A" "$BASE/api/tasks" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const d=JSON.parse(s);const arr=d.tasks||[];const t=arr.find(x=>x.title==='Quiz 1: Heuristics');console.log(t?(t._id||t.id||''):'')}catch(e){console.log('')}})")
ANN_ID=$(curl -s -H "Cookie: aics_session=$T_STU_A" "$BASE/api/announcements" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const d=JSON.parse(s);const a=(d.announcements||[])[0];console.log(a?(a._id||a.id||''):'')}catch(e){console.log('')}})")
echo "  task id: ${TID:-none}; announcement id: ${ANN_ID:-none}"

SK_CS101='CS%20101%7C2026-2027%7C1st%20Sem'

# ------------------------------------------------------------
echo "== 5. scenario matrix =="
if [ "$UPDATE" = 1 ]; then rm -f "$LOG_DIR/authz-actuals.tsv"; touch "$LOG_DIR/authz-actuals.tsv"; fi

# --- auth gates ---
sc AUTH-NO-SESSION none GET /api/student seeded 401 - - "unauthenticated gate (proxy)"
sc AUTH-SESSION-SELF studentA GET /api/auth/session seeded 200 - - "public passthrough, revocation-aware"
sc DEMO-LOGIN none POST /api/auth/demo seeded - - - "demo login gated off in production builds (L5 pin; both worlds 404)"

# --- student surface ---
sc STU-READ-SELF studentA GET "/api/student?username=juan.santos" seeded 200 - 'contains:Juan Dela Cruz Santos' "positive control"
sc STU-READ-OTHER-STU studentB GET "/api/student?username=juan.santos" seeded 403 - - "student vs student"
sc STU-READ-ABSENT studentA GET "/api/student?username=ghost.user" absent 403 - - "L1 fixed at C3.8: authz precedes existence, uniform deny (issue #65)"
sc STU-READ-ABSENT-STAFF facultyX GET "/api/student?username=ghost.user" absent 403 - - "L1 fixed at C3.8: staff absent-name read denies like cross-branch, no oracle (issue #65)"
sc STU-READ-STAFF facultyX GET "/api/student?username=juan.santos" seeded 200 - 'contains:juan.santos@aics.edu.ph' "D2 pin: staff PII breadth (unresolved policy, issue #79)"
sc STU-READ-STALE-ROLE staleFac GET "/api/student?username=juan.santos" seeded 200 - - "M2 fixed at C2.2: role read from the DB, stale faculty claim denied (issue #62)"
sc STU-READ-XBRANCH-STAFF facultyX GET "/api/student?username=pedro.vasquez" novaliches student 403 - - "cross-branch staff read denied"
sc STU-GRADES-ALL-RELEASED studentC GET "/api/student?username=a.castillo" seeded 200 - 'contains:"finalGrade":"87.60"' "released periods visible + finalGrade via legacy field"
sc STU-GRADES-PARTIAL studentD GET "/api/student?username=b.mendoza" seeded 200 - 'contains:"finalGrade":"80.00"' "A5: legacy gradeStatus exposes finalGrade early; flips to - at C3.13 (issue #70)"
sc STU-EXPORT-SELF studentA GET /api/student/export seeded 200 - - "self export"
sc STU-TASKS-SELF studentA GET /api/tasks seeded 200 - - "own tasks"
sc STU-TASKS-OTHER studentB GET "/api/tasks?username=juan.santos" seeded 403 - - "student vs student tasks"
sc STU-TASKS-ABSENT studentB GET "/api/tasks?username=ghost.user" absent 403 - - "L1 fixed at C3.8: uniform deny, absent or not (issue #65)"
sc STU-TASKS-ABSENT-STAFF facultyX GET "/api/tasks?username=ghost.user" absent 404 - - "L1 fixed at C3.8: 404 only post-gate for authorized staff (issue #65)"
sc STU-TASKS-STALE-ROLE staleFac GET "/api/tasks?username=juan.santos" seeded 200 - - "M2 fixed at C2.4: role read from the DB, stale faculty claim denied (issue #62)"
sc STU-ENROLL-SELF studentA GET /api/enrollment seeded 200 - - "own finances"
sc STU-ENROLL-OTHER studentB GET "/api/enrollment?username=juan.santos" seeded 403 - - "staff denied by design too"
sc STU-UPDATE-SELF studentA PATCH "/api/student/update?username=juan.santos" seeded '{"phone":"+63 917 123 9999"}' - - "self profile update (username via query)"
sc STU-UPDATE-OTHER studentB PATCH "/api/student/update?username=juan.santos" seeded '{"phone":"+63 917 123 9999"}' - - "non-admin editing another profile"
sc STU-UPDATE-STALE-ADMIN staleAdm PATCH "/api/student/update?username=juan.santos" seeded '{"phone":"+63 917 123 9998"}' - - "M2 fixed at C2.2: role read from the DB, stale admin claim denied (issue #62)"

# --- faculty reads ---
sc FAC-ROSTER-SELF facultyX GET "/api/faculty?username=m.reyes" seeded 200 - 'contains:CS 101' "teaching-load roster"
sc FAC-ROSTER-STUDENT studentA GET "/api/faculty?username=m.reyes" seeded 403 - - "role gate"
sc FAC-TASKS-SELF facultyX GET /api/faculty/tasks seeded 200 - - "server-derived load + term"
sc FAC-HISTORY-SELF facultyX GET /api/faculty/history seeded 200 - - "released-only rows"
sc NOTIF-INBOX-SELF studentA GET "/api/notifications?username=juan.santos" seeded 200 - - "own inbox"
sc NOTIF-INBOX-STAFF facultyX GET "/api/notifications?username=juan.santos" seeded 200 - - "D2 pin: staff inbox breadth (issue #79)"
sc NOTIF-INBOX-STALE-ROLE staleFac GET "/api/notifications?username=juan.santos" seeded 200 - - "M2 fixed at C2.4: role read from the DB, stale faculty claim denied (issue #62)"
sc NOTIF-SENT-SELF facultyX GET "/api/notifications/sent?sentBy=m.reyes" seeded 200 - - "own outbox"

# --- materials ---
sc MAT-LIST-STUDENT studentA GET /api/materials seeded 200 - - "enrolled student list"
sc MAT-LIST-FACULTY facultyX GET /api/materials seeded 200 - - "load-scoped faculty list"
sc MAT-FOREIGN-URL facultyX POST /api/materials seeded '{"branch":"commonwealth","subjectCode":"CS 208","title":"Authz rogue link","kind":"link","url":"https://res.cloudinary.com/verify-fake-cloud/image/upload/rogue/asset.png"}' - 'contains:upload folder' "M4 fixed at C3.7: own-cloud URLs must sit under the signed subject folder (issue #64)"

# --- attendance ---
sc ATT-READ-OWN facultyX GET "/api/attendance?sectionKey=$SK_CS101" seeded 200 - - "own section read"
sc ATT-READ-OTHER facultyY GET "/api/attendance?sectionKey=$SK_CS101" seeded 403 - - "H2 fixed at C3.4: teachesSection required, faculty reads load-scoped (issue #60)"
sc ATT-WRITE-OWN facultyX POST /api/attendance seeded '{"branch":"commonwealth","sectionKey":"CS 101|2026-2027|1st Sem","date":"2026-10-15","records":{"a.santos100":"present"}}' - - "own section write (roster member key)"
sc ATT-WRITE-OTHER facultyY POST /api/attendance seeded '{"branch":"commonwealth","sectionKey":"CS 101|2026-2027|1st Sem","date":"2026-10-16","records":{"a.santos100":"present"}}' - - "H2 fixed at C3.4: teachesSection required, cross-faculty write denied (issue #60)"
sc ATT-WRITE-ROGUE-KEY facultyX POST /api/attendance seeded '{"branch":"commonwealth","sectionKey":"CS 101|2026-2027|1st Sem","date":"2026-10-17","records":{"ghost.user":"present"}}' - 'contains:Records must only include students enrolled in this section' "H2 fixed at C3.4: records keys roster-validated (issue #60)"
sc ATT-BRANCH-MISMATCH facultyX POST /api/attendance seeded '{"branch":"novaliches","sectionKey":"CS 101|2026-2027|1st Sem","date":"2026-10-18","records":{"a.santos100":"present"}}' - - "L2: 400 not 403; flips at C3.9 (issue #66)"
sc ATT-SPOOF facultyX POST /api/attendance seeded '{"branch":"commonwealth","sectionKey":"CS 101|2026-2027|1st Sem","date":"2026-10-19","records":{"a.santos100":"present"},"performedBy":"l.bautista"}' - - "spoof check"

# --- notifications writes ---
sc NOTIF-SEND-OWN facultyX POST /api/notifications seeded '{"branch":"commonwealth","title":"Authz golden notice","body":"Cast message.","sectionKeys":["CS 101|2026-2027|1st Sem"]}' - - "owned section fan-out"
sc NOTIF-SEND-UNOWNED facultyY POST /api/notifications seeded '{"branch":"commonwealth","title":"Authz golden notice Y","body":"Cast message.","sectionKeys":["CS 101|2026-2027|1st Sem","CS 103|2026-2027|1st Sem"]}' - - "preserved behavior: unowned keys dropped, owned fan out"
sc NOTIF-PATCH-SELF studentA PATCH /api/notifications seeded '{"username":"juan.santos","all":true}' - - "self read-state"
sc NOTIF-PATCH-OTHER studentB PATCH /api/notifications seeded '{"username":"juan.santos","all":true}' - - "write filter carries username"

# --- announcements ---
sc ANN-READ-STUDENT studentA POST /api/announcements/read seeded "{\"username\":\"juan.santos\",\"announcementId\":\"$ANN_ID\",\"action\":\"read\"}" - - "self mark-read"
sc ANN-READ-OVERCAP studentA POST /api/announcements/read seeded "{\"username\":\"juan.santos\",\"ids\":[$(node -e "console.log(Array(201).fill('\"000000000000000000000000\"').join(','))")],\"action\":\"read\"}" - - "L4: unbounded ids; flips 400 at C3.11 (issue #68)"
sc ANN-BULK-DELETE-STUDENT studentA POST /api/announcements/bulk-delete seeded "{\"ids\":[\"$ANN_ID\"]}" - - "admin-only write"

# --- events (admin write pattern) ---
sc EV-WRITE-ADMIN admin POST /api/events seeded '{"title":"Authz golden event","description":"Cast event.","date":"2026-11-20","category":"campus"}' - - "admin write"
sc EV-WRITE-FACULTY facultyX POST /api/events seeded '{"title":"Authz golden event","description":"Cast event.","date":"2026-11-20","category":"campus"}' - - "admin-only write"
sc ANN-WRITE-XBRANCH admin2 POST /api/announcements seeded '{"branch":"commonwealth","title":"XBranch write attempt","body":"Should be denied.","category":"general","performedBy":"admin2"}' - - "cross-branch admin write denied"

# --- admin reads (D1) ---
sc ADM-STATS-ADMIN admin GET /api/admin/stats seeded 200 - - "admin stats"
sc ADM-STATS-FACULTY facultyX GET /api/admin/stats seeded 403 - - "role gate"
sc ADM-STATS-STUDENT studentA GET /api/admin/stats seeded 403 - - "role gate"
sc ADM-PEOPLE-XBRANCH admin2 GET /api/admin/people seeded 200 - - "D1 pin: school-wide admin reads (issue #78)"
sc ADM-ENROLL-XBRANCH admin2 GET /api/admin/enrollment seeded 200 - - "D1 pin"

# --- tasks writes (teaching-load guard where it IS applied) ---
sc TASK-CREATE-OWN facultyX POST /api/tasks seeded '{"branch":"commonwealth","subjectCode":"CS 101","title":"Authz golden task","type":"Activity","maxScore":10,"dueDate":"2026-11-01"}' - - "load-checked create (contrast with C1)"
sc TASK-CREATE-OTHER facultyY POST /api/tasks seeded '{"branch":"commonwealth","subjectCode":"CS 101","title":"Authz golden task Y","type":"Activity","maxScore":10,"dueDate":"2026-11-01"}' - - "requireTeachingFaculty blocks: control row for C1"
sc TASK-CLOSE-OTHER facultyY PATCH /api/tasks seeded '{"branch":"commonwealth","subjectCode":"CS 101","title":"Authz golden task","submissionsClosed":true}' - - "load-checked close"
if [ -n "$TID" ]; then
  sc TASK-GRADE-OWN facultyX PATCH "/api/tasks/$TID/grade" seeded '{"score":8}' - - "load-checked grade"
  sc TASK-GRADE-OTHER facultyY PATCH "/api/tasks/$TID/grade" seeded '{"score":5}' - - "load-checked grade, other faculty"
else
  echo "  WARN  no task id extracted; TASK-GRADE rows skipped"
fi

# --- grades workflow (mutations in dependency order) ---
sc GRD-QUEUE-ADMIN admin GET /api/grades/release seeded 200 - 'contains:CS 103' "queue shows jose.garcia submitted prelim"
sc GRD-QUEUE-FACULTY facultyX GET /api/grades/release seeded 403 - - "admin-only queue"
sc GRD-UPD-OWN-DRAFT facultyY PATCH /api/grades/update seeded '{"updates":[{"studentUsername":"maria.cruz","subjectCode":"CS 103","branch":"commonwealth","academicYear":"2026-2027","semester":"1st Sem","prelim":"86"}]}' - - "encode own draft row"
sc GRD-UPD-SUBMITTED facultyY PATCH /api/grades/update seeded '{"updates":[{"studentUsername":"jose.garcia","subjectCode":"CS 103","branch":"commonwealth","academicYear":"2026-2027","semester":"1st Sem","prelim":"89"}]}' - 'contains:Submitted grades are locked' "H1a fixed at C3.3: submitted periods state-locked, envelope reason in body (issue #58)"
sc GRD-UPD-RELEASED facultyY PATCH /api/grades/update seeded '{"updates":[{"studentUsername":"a.castillo","subjectCode":"CS 103","branch":"commonwealth","academicYear":"2026-2027","semester":"1st Sem","prelim":"91"}]}' - 'contains:Released grades are locked' "H1a fixed at C3.3: released periods state-locked, correction is the admin unrelease path (issue #58)"
sc GRD-SUBMIT-OWN facultyY POST /api/grades/submit seeded '{"branch":"commonwealth","subjectCode":"CS 103","academicYear":"2026-2027","semester":"1st Sem","period":"prelim"}' - - "own subject submit"
sc GRD-SUBMIT-OTHER facultyX POST /api/grades/submit seeded '{"branch":"commonwealth","subjectCode":"CS 103","academicYear":"2026-2027","semester":"1st Sem","period":"prelim"}' - - "C1 fixed at C3.1: teaching-load gate + professor key in the write scope, cross-faculty submit denied (issue #57)"
sc GRD-SUBMIT-SPOOF facultyX POST /api/grades/submit seeded '{"branch":"commonwealth","subjectCode":"CS 208","academicYear":"2026-2027","semester":"1st Sem","period":"prelim","performedBy":"l.bautista"}' - - "spoof check"
sc GRD-WITHDRAW-OWN facultyY PATCH /api/grades/update seeded '{"updates":[{"studentUsername":"maria.cruz","subjectCode":"CS 103","branch":"commonwealth","academicYear":"2026-2027","semester":"1st Sem","withdraw":"prelim"}]}' - - "H1a fixed at C3.3: submitted period withdrawn to draft, audited (issue #58)"
sc GRD-WITHDRAW-DRAFT facultyY PATCH /api/grades/update seeded '{"updates":[{"studentUsername":"maria.cruz","subjectCode":"CS 103","branch":"commonwealth","academicYear":"2026-2027","semester":"1st Sem","withdraw":"prelim"}]}' - 'contains:Only submitted grades can be withdrawn' "H1a state guard: draft periods are not withdrawable (issue #58)"
sc GRD-RELEASE-FACULTY facultyY POST /api/grades/release seeded '{"branch":"commonwealth","subjectCode":"CS 103","academicYear":"2026-2027","semester":"1st Sem","period":"prelim"}' - - "admin-only release"
sc GRD-RELEASE-ADMIN admin POST /api/grades/release seeded '{"branch":"commonwealth","subjectCode":"CS 103","academicYear":"2026-2027","semester":"1st Sem","period":"prelim"}' - - "admin release positive"
sc GRD-UNRELEASE-ADMIN admin POST /api/grades/release seeded '{"branch":"commonwealth","subjectCode":"CS 103","academicYear":"2026-2027","semester":"1st Sem","period":"prelim","action":"unrelease"}' - - "H1a fixed at C3.3: admin unrelease, released to submitted, audited (issue #58)"
sc GRD-UNRELEASE-FACULTY facultyY POST /api/grades/release seeded '{"branch":"commonwealth","subjectCode":"CS 103","academicYear":"2026-2027","semester":"1st Sem","period":"prelim","action":"unrelease"}' - - "H1a: unrelease is admin-only (issue #58)"
sc GRD-UNRELEASE-XBRANCH admin2 POST /api/grades/release seeded '{"branch":"commonwealth","subjectCode":"CS 103","academicYear":"2026-2027","semester":"1st Sem","period":"prelim","action":"unrelease"}' - - "H1a: cross-branch admin unrelease denied (issue #58)"
sc GRD-AUDITS-BRANCHWIDE facultyX GET /api/grades/audits 'after submit+release' 200 - '!contains:CS 103' "M1 fixed at C3.5: faculty read their own subjects only; facultyX does not teach CS 103 (issue #61)"
sc GRD-AUDITS-OWN facultyY GET /api/grades/audits 'after submit+release' 200 - 'contains:CS 103' "own-subject audits stay visible post C3.5"
sc GRD-AUDITS-WITHDRAW facultyY GET /api/grades/audits 'after withdraw' 200 - 'contains:withdraw' "H1a: withdrawal writes a visible audit row (issue #58)"
sc GRD-AUDITS-UNRELEASE admin GET /api/grades/audits 'after unrelease' 200 - 'contains:unrelease' "H1a: unrelease writes a visible audit row (issue #58)"
sc GRD-AUDITS-STUDENT studentA GET /api/grades/audits seeded 403 - - "role gate"

# --- cron cleanup path (M3) ---
sc CRON-ADMIN-SESSION admin POST /api/notifications/cleanup seeded - - - "admin session path works today"
sc CRON-NO-BEARER none POST /api/notifications/cleanup seeded - - - "no credential: proxy 401 before route"
sc CRON-WRONG-BEARER none POST /api/notifications/cleanup seeded - 'Authorization: Bearer wrong-secret' - "wrong secret: proxy 401 (timing-safe compare fails)"
sc CRON-RIGHT-BEARER none POST /api/notifications/cleanup seeded - 'Authorization: Bearer authz-cron-test-secret' 'contains:retentionDays' "M3 fixed at C3.6: valid bearer admitted, cleanup runs (issue #63)"

# --- login characterization (L3) ---
sc LOGIN-ROGUE-ROLE none POST /api/auth/login seeded '{"username":"rogue.role","password":"student123"}' - - "L3 CURRENTLY PERMITS: corrupt role signed; flips 4xx at C3.10 (issue #67)"

# --- revocation (two-step, runs LAST: bumps juan tv) ---
if [ "$UPDATE" = 1 ]; then
  curl -s -o /dev/null -X POST -H "Cookie: aics_session=$T_STU_A" "$BASE/api/auth/logout"
  REV_STATUS=$(curl -s -o "$BODY_FILE" -w '%{http_code}' -H "Cookie: aics_session=$T_STU_A" "$BASE/api/student")
  printf 'SESSION-REVOKED\t%s\n' "$REV_STATUS" >> "$LOG_DIR/authz-actuals.tsv"
  DEFS+=("$(printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s' 'SESSION-REVOKED' 'studentA' 'GET' '/api/student' 'tv bumped via logout' '-' '-' 'revocation control, never flips')")
  printf '  RUN   %-28s %s\n' 'SESSION-REVOKED' "$REV_STATUS"
else
  EXP_REV=$(awk -F'\t' -v id='SESSION-REVOKED' '$1==id{print $6}' "$GOLDENS" 2>/dev/null)
  curl -s -o /dev/null -X POST -H "Cookie: aics_session=$T_STU_A" "$BASE/api/auth/logout"
  REV_STATUS=$(curl -s -o /dev/null -w '%{http_code}' -H "Cookie: aics_session=$T_STU_A" "$BASE/api/student")
  if [ "${EXP_REV:-401}" = "$REV_STATUS" ]; then ok "SESSION-REVOKED -> $REV_STATUS"; else bad "SESSION-REVOKED: expected ${EXP_REV:-401}, got $REV_STATUS"; fi
fi

# ------------------------------------------------------------
echo ""
if [ "$UPDATE" = 1 ]; then
  echo "== regenerating $GOLDENS =="
  rm -f "$GOLDENS"
  printf 'id\tactor\tmethod\ttarget\tprecondition\texpect_status\texpect_body\tnotes\n' >> "$GOLDENS"
  while IFS=$'\t' read -r id status; do
    for def in "${DEFS[@]}"; do
      did=$(printf '%s' "$def" | cut -f1)
      if [ "$did" = "$id" ]; then
        printf '%s\t%s\n' "$def" "$status" | awk -F'\t' 'BEGIN{OFS="\t"}{print $1,$2,$3,$4,$5,$9,$7,$8}' >> "$GOLDENS"
        break
      fi
    done
  done < "$LOG_DIR/authz-actuals.tsv"
  echo "wrote $(wc -l < "$GOLDENS") lines (incl. header) from $ROWS_RUN run rows"
fi

echo ""
echo "== summary: $PASS passed, $FAIL failed, $ROWS_RUN rows =="
[ "$FAIL" -eq 0 ]
