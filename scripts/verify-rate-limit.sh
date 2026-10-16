#!/usr/bin/env bash
# ============================================================
#  verify-rate-limit.sh — end-to-end verification for general
#  API rate limiting (src/lib/rate-limit.ts + src/middleware.ts,
#  docs/rate-limiting.md)
#
#  Runs in ONE invocation because background processes do not
#  survive between shell sessions in this environment:
#
#    1. boot a throwaway local mongod + seed + `next start`
#    2. sanity — normal traffic is unaffected: real login succeeds
#       and sets the session cookie, authed GETs 200, health stub
#       stays unlimited, faculty correctly 403 on admin-only write
#    3. tier boundaries — each family runs from its own forged
#       x-forwarded-for source IP / identity, so buckets collide
#       only where the test wants them to:
#         auth  tier (100/5min per IP):        101st login POST  -> 429
#         read  tier (300/5min per username):  301st authed GET  -> 429
#         write tier (120/5min per username):  121st authed POST -> 429
#         unauthed reads (300/5min per IP):    301st cookieless  -> 429
#    4. route-level login failure throttle still fires UNDER the
#       middleware tier (11th failed login for one username -> 429
#       with the route message, not the middleware message)
#    5. 429 shape: JSON {ok:false,error} + numeric Retry-After
#    6. identity isolation — exhausted buckets never leak to
#       another user; /portal pages are not rate-limited
#    7. floods persist nothing (announcements/notifications
#       counts unchanged)
#
#  Requires: db/mongodb-linux-x86_64-debian12-8.0.12/, node_modules,
#  a production build (.next from `next build`).
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="http://127.0.0.1:3113"
MONGO_BIN="db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"
export MONGODB_URI=mongodb://127.0.0.1:27017
export MONGODB_DB=aics_portal
export AUTH_SECRET=local-dev-secret-aics-portal-ratelimit-2026
MONGO_PID=""; DEV_PID=""
PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

trap '
  [ -n "$DEV_PID" ]  && kill "$DEV_PID"  2>/dev/null || true
  [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
  true
' EXIT

# flood <n> <curl-args...> — per-status counters so a connection
# error can never masquerade as a pass condition.
F200=0; F400=0; F401=0; F403=0; F429=0; FOTH=0
flood() {
  local n=$1; shift
  F200=0; F400=0; F401=0; F403=0; F429=0; FOTH=0
  local c
  for _ in $(seq 1 "$n"); do
    c=$(curl -s -o /dev/null -w '%{http_code}' "$@")
    case "$c" in
      200) F200=$((F200+1));;
      400) F400=$((F400+1));;
      401) F401=$((F401+1));;
      403) F403=$((F403+1));;
      429) F429=$((F429+1));;
      *)   FOTH=$((FOTH+1));;
    esac
  done
}

login() { # login <ip> <user> <pass> -> status code
  curl -s -o /dev/null -w '%{http_code}' \
    -H 'content-type: application/json' -H "x-forwarded-for: $1" \
    -d "{\"username\":\"$2\",\"password\":\"$3\"}" "$BASE/api/auth/login"
}

mongo_count() { # mongo_count <collection>
  node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();console.log(await c.db('aics_portal').collection(process.argv[1]).countDocuments({}));await c.close()})()" "$1" 2>/dev/null
}

# ------------------------------------------------------------
echo "== 1. boot mongod + seed + next start =="
mkdir -p db/data
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

node_modules/.bin/next start -p 3113 > db/dev.log 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/" && break
  sleep 1
done
if curl -sf -o /dev/null "$BASE/"; then ok "server up ($BASE)"; else bad "server did not start (db/dev.log)"; tail -20 db/dev.log; exit 1; fi

# ------------------------------------------------------------
echo "== 2. sessions =="
ADMIN_TOKEN=$(node scripts/mint-session.mjs admin admin commonwealth)
STUDENT_TOKEN=$(node scripts/mint-session.mjs juan.santos student commonwealth)
STUDENT2_TOKEN=$(node scripts/mint-session.mjs maria.cruz student commonwealth)
FACULTY_TOKEN=$(node scripts/mint-session.mjs m.reyes faculty commonwealth)
AC="Cookie: aics_session=$ADMIN_TOKEN"
SC="Cookie: aics_session=$STUDENT_TOKEN"
MC="Cookie: aics_session=$STUDENT2_TOKEN"
FC="Cookie: aics_session=$FACULTY_TOKEN"
[ -n "$ADMIN_TOKEN" ] && [ -n "$STUDENT_TOKEN" ] && [ -n "$STUDENT2_TOKEN" ] && [ -n "$FACULTY_TOKEN" ] \
  && ok "minted admin + 2 student + faculty sessions" || { bad "session minting failed"; exit 1; }

PRE_ANN=$(mongo_count announcements)
PRE_NOTIF=$(mongo_count notifications)

# ------------------------------------------------------------
echo "== 3. sanity: normal traffic unaffected =="
flood 5 "$BASE/api"
[ "$F200" -eq 5 ] && ok "health stub GET /api stays unlimited (5x 200)" || bad "health stub: 200=$F200 other=$FOTH"

LOGIN_OUT=$(curl -si -H 'content-type: application/json' -H 'x-forwarded-for: 10.1.0.1' \
  -d '{"username":"juan.santos","password":"student123"}' "$BASE/api/auth/login")
echo "$LOGIN_OUT" | grep -qE '^HTTP/[0-9.]+ 200' && echo "$LOGIN_OUT" | grep -qi 'set-cookie: aics_session' \
  && ok "real login succeeds and sets the session cookie" || bad "login flow broken"

c=$(curl -s -o /dev/null -w '%{http_code}' -H "$SC" "$BASE/api/student")
[ "$c" = "200" ] && ok "authed GET /api/student -> 200" || bad "authed GET /api/student -> $c"

c=$(curl -s -o /dev/null -w '%{http_code}' -H "$SC" "$BASE/api/auth/session")
[ "$c" = "200" ] && ok "GET /api/auth/session -> 200 (public, read tier)" || bad "session route -> $c"

c=$(curl -s -o /dev/null -w '%{http_code}' -H "$FC" -H 'content-type: application/json' \
  -d '{"branch":"commonwealth","title":"rl probe","body":"rl probe","category":"general"}' "$BASE/api/announcements")
[ "$c" = "403" ] && ok "faculty POST /api/announcements -> 403 (admin-only role gate intact)" || bad "faculty announcements POST -> $c"

# ------------------------------------------------------------
echo "== 4. auth tier: 100 login POSTs / 5 min per IP =="
# Rotating usernames keep the route-level per-username throttle out of the
# picture, so the boundary observed here is purely the middleware auth tier.
F200=0; F400=0; F401=0; F403=0; F429=0; FOTH=0
for i in $(seq 1 105); do
  c=$(login 10.2.0.1 "rl-spray-$i" wrong)
  case "$c" in
    401) F401=$((F401+1));;
    429) F429=$((F429+1));;
    *)   FOTH=$((FOTH+1));;
  esac
done
[ "$F401" -eq 100 ] && [ "$F429" -eq 5 ] && [ "$FOTH" -eq 0 ] \
  && ok "auth tier boundary exact: 100x 401 then 429x 5 (rotating usernames, one IP)" \
  || bad "auth tier: 401=$F401 429=$F429 other=$FOTH (expected 100/5/0)"

OUT=$(curl -si -H 'content-type: application/json' -H 'x-forwarded-for: 10.2.0.1' \
  -d '{"username":"rl-spray-again","password":"wrong"}' "$BASE/api/auth/login")
RA=$(echo "$OUT" | grep -i '^retry-after:' | head -1 | tr -d '\r' | awk '{print $2}')
echo "$OUT" | grep -qE '^HTTP/[0-9.]+ 429' && echo "$OUT" | grep -q 'Too many requests' \
  && [ -n "$RA" ] && [ "$RA" -ge 1 ] && [ "$RA" -le 300 ] \
  && ok "429 shape: JSON error + Retry-After: ${RA}s (<= 5-min window)" \
  || bad "429 shape wrong (retry-after='$RA')"

# ------------------------------------------------------------
echo "== 5. route-level failure throttle fires under the middleware =="
ROUTE429=0
for i in $(seq 1 10); do
  c=$(login 10.3.0.1 juan.santos definitely-wrong)
  [ "$c" = "429" ] && ROUTE429=$((ROUTE429+1))
done
# 10 failures pass (401 each); the 11th trips the ROUTE throttle with its own message.
OUT11=$(curl -si -H 'content-type: application/json' -H 'x-forwarded-for: 10.3.0.1' \
  -d '{"username":"juan.santos","password":"definitely-wrong"}' "$BASE/api/auth/login")
[ "$ROUTE429" -eq 0 ] && echo "$OUT11" | grep -qE '^HTTP/[0-9.]+ 429' && echo "$OUT11" | grep -q 'Too many login attempts' \
  && ok "route throttle under middleware: 10 fails pass, 11th -> 429 'Too many login attempts' (defense in depth)" \
  || bad "route-level login throttle broken (429 seen during first 10: $ROUTE429)"

# ------------------------------------------------------------
echo "== 6. read tier: 300 authed GETs / 5 min per username =="
flood 305 -H "$MC" "$BASE/api/student"
[ "$F200" -eq 300 ] && [ "$F429" -eq 5 ] && [ "$FOTH" -eq 0 ] \
  && ok "read tier boundary exact: 300x 200 then 429x 5 (maria.cruz)" \
  || bad "read tier: 200=$F200 429=$F429 other=$FOTH (expected 300/5/0)"

c=$(curl -s -o /dev/null -w '%{http_code}' -H "$SC" "$BASE/api/student")
[ "$c" = "200" ] && ok "isolation: juan.santos still 200 while maria.cruz is throttled" \
  || bad "read-tier bucket leaked across users (juan -> $c)"

c=$(curl -s -o /dev/null -w '%{http_code}' -H "$AC" "$BASE/api/admin/stats")
[ "$c" = "200" ] && ok "isolation: admin /api/admin/stats still 200" || bad "admin stats -> $c"

c=$(curl -s -o /dev/null -w '%{http_code}' -H "$MC" "$BASE/portal/commonwealth/student/maria.cruz")
[ "$c" = "200" ] && ok "/portal page renders 200 even with an exhausted API bucket" \
  || bad "portal page -> $c (pages must not be rate-limited)"
c=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/portal/commonwealth/student/maria.cruz")
[ "$c" = "307" ] && ok "portal page without cookie still bounces to login (307)" || bad "portal gate -> $c"

# ------------------------------------------------------------
echo "== 7. write tier: 120 authed POSTs / 5 min per username =="
flood 125 -X POST -H "$SC" -H 'content-type: application/json' \
  -d '{"branch":"commonwealth","title":"rl flood probe","body":"rate limit verification probe","category":"general"}' \
  "$BASE/api/announcements"
[ "$F403" -eq 120 ] && [ "$F429" -eq 5 ] && [ "$FOTH" -eq 0 ] \
  && ok "write tier boundary exact: 120x 403 then 429x 5 (juan, admin-only route, nothing persists)" \
  || bad "write tier: 403=$F403 429=$F429 other=$FOTH (expected 120/5/0)"

c=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$FC" -H 'content-type: application/json' \
  -d '{}' "$BASE/api/notifications")
[ "$c" = "400" ] && ok "isolation: faculty write still processed (400 zod) while juan is write-throttled" \
  || bad "write-tier bucket leaked across users (faculty -> $c)"

# ------------------------------------------------------------
echo "== 8. unauthenticated reads: 300 cookieless GETs / 5 min per IP =="
flood 305 -H 'x-forwarded-for: 10.4.0.1' "$BASE/api/student"
[ "$F401" -eq 300 ] && [ "$F429" -eq 5 ] && [ "$FOTH" -eq 0 ] \
  && ok "unauthed flood boundary exact: 300x 401 then 429x 5 (IP-keyed)" \
  || bad "unauthed flood: 401=$F401 429=$F429 other=$FOTH (expected 300/5/0)"

# ------------------------------------------------------------
echo "== 9. floods persisted nothing =="
POST_ANN=$(mongo_count announcements)
POST_NOTIF=$(mongo_count notifications)
[ "$POST_ANN" = "$PRE_ANN" ] && [ "$POST_NOTIF" = "$PRE_NOTIF" ] \
  && ok "announcements ($POST_ANN) + notifications ($POST_NOTIF) counts unchanged" \
  || bad "flood wrote data (ann $PRE_ANN->$POST_ANN, notif $PRE_NOTIF->$POST_NOTIF)"

# ------------------------------------------------------------
echo ""
echo "== RESULT: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ] && echo "RATE-LIMIT VERIFICATION PASSED" || echo "RATE-LIMIT VERIFICATION FAILED"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
