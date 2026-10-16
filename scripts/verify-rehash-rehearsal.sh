#!/usr/bin/env bash
# =====================================================================
# verify-rehash-rehearsal.sh — full fresh-environment rehearsal of the
# production password-rehash runbook (docs/password-rehash-runbook.md)
#
# First executed: 2026-10-16 (fresh sandbox, post PR #44-#47, node 24).
# Context: owner opened the production window; the Atlas production
# MONGODB_URI does not exist in this sandbox, so this script re-proves
# the entire toolchain end-to-end and feeds the hand-off (QA report 18).
#
# Runs in ONE invocation on purpose: background processes (mongod,
# next dev) do not survive between shell sessions in this environment.
#
# Sequence (runbook steps 0-5 + QA drill 13 rollback leg):
#   0. preflight — node_modules, materialize tooling from git history
#   1. provision mongod 8.0.12 into db/ (gitignored), throwaway instance
#   2. seed with the LAST PLAINTEXT-ERA seed (6eee07d~1) — the exact
#      condition production is in today
#   3. dry-run (counts only, zero writes)
#   4. BACKUP_KEY generation + AES-256-GCM encrypted backup
#   5. apply --expect N --bump-tv  -> verified N/N, remaining-plaintext=0
#   5a. --expect guard negative test (must ABORT with zero writes)
#   6. rollback drill -> restored N/N, dry-run re-count back to N
#   7. re-apply --expect N --bump-tv
#   8. runbook step 5: --apply --expect 0 --bump-all (all sessions die)
#   9. spot-check: 100% scrypt$ prefixes, min tokenVersion >= 1
#  10. real-app login checks via next dev: student/faculty/admin 200
#      with session cookie; wrong password 401
# =====================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

MONGO_TGZ_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian12-8.0.12.tgz"
MONGO_DIR="db/mongodb-linux-x86_64-debian12-8.0.12"
MONGO_BIN="${MONGO_DIR}/bin/mongod"
DBPATH="db/data"
BACKUP_DIR="db/backups"
STAMP="$(date +%Y%m%d)"
BACKUP_FILE="${BACKUP_DIR}/students-${STAMP}.json.enc"
KEY_FILE="${BACKUP_DIR}/aics-rehash-${STAMP}.key"
PORT="3113"
# The rehearsal NEVER leaves localhost — no Atlas URI is ever used here.
export MONGODB_URI="mongodb://127.0.0.1:27017"
export MONGODB_DB="aics_portal"
export AUTH_SECRET="local-rehearsal-secret-aics-portal-rehash-${STAMP}"

PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
die() { echo "  ABORT: $1 (passed=${PASS} failed=${FAIL})"; exit 2; }

MONGO_PID=""; DEV_PID=""
cleanup() {
  if [ -n "$DEV_PID" ];   then kill "$DEV_PID"   2>/dev/null || true; fi
  if [ -n "$MONGO_PID" ]; then kill "$MONGO_PID" 2>/dev/null || true; fi
  pkill -f "next dev -p ${PORT}" 2>/dev/null || true
  pkill -f "mongod --dbpath ${DBPATH}" 2>/dev/null || true
  return 0
}
trap cleanup EXIT

# ---------------------------------------------------------------------
echo "== 0. preflight =="
for d in node_modules/mongodb node_modules/dotenv node_modules/next; do
  if [ -d "$d" ]; then ok "dependency present: $d"; else bad "dependency missing: $d"; fi
done
[ -d node_modules/mongodb ] && [ -d node_modules/dotenv ] && [ -d node_modules/next ] || die "node_modules incomplete"

mkdir -p scripts db/backups
git show main-full-dev:scripts/rehash-passwords.ts > scripts/rehash-passwords.ts
git show '6eee07d~1:scripts/seed-mongodb.ts'      > scripts/seed-plaintext.ts
LINES=$(wc -l < scripts/rehash-passwords.ts);  [ "$LINES" -gt 100 ] && ok "rehash tool materialized from main-full-dev (${LINES} lines)" || die "rehash tool missing"
LINES=$(wc -l < scripts/seed-plaintext.ts);     [ "$LINES" -gt 300 ] && ok "plaintext-era seed materialized from 6eee07d~1 (${LINES} lines)" || die "seed missing"

echo "  node $(node --version)"

# ---------------------------------------------------------------------
echo "== 1. provision + boot mongod 8.0.12 (throwaway, dbpath db/data) =="
if [ ! -x "$MONGO_BIN" ]; then
  echo "  downloading mongod tarball (~90MB)..."
  curl -sL --retry 3 --max-time 300 -o db/mongod.tgz "$MONGO_TGZ_URL" || die "mongod download failed"
  tar -xzf db/mongod.tgz -C db/ || die "mongod extract failed"
fi
[ -x "$MONGO_BIN" ] && ok "mongod binary present: $("$MONGO_BIN" --version | head -1)" || die "mongod binary missing"

pkill -f "mongod --dbpath ${DBPATH}" 2>/dev/null || true
rm -rf "$DBPATH"; mkdir -p "$DBPATH"
"$MONGO_BIN" --dbpath "$DBPATH" --port 27017 --bind_ip 127.0.0.1 --quiet > db/mongod.log 2>&1 &
MONGO_PID=$!
UP=0
for i in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && { UP=1; break; }
  sleep 1
done
if [ "$UP" = 1 ] && kill -0 "$MONGO_PID" 2>/dev/null; then ok "mongod up (pid $MONGO_PID)"; else bad "$(tail -5 db/mongod.log 2>/dev/null)"; die "mongod did not start"; fi

# ---------------------------------------------------------------------
echo "== 2. seed — LAST PLAINTEXT-ERA seed (production-shaped state) =="
node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();await c.db('aics_portal').dropDatabase().catch(()=>{});await c.close()})()" || die "drop failed"
if node scripts/seed-plaintext.ts > db/seed.log 2>&1; then ok "plaintext-era seed completed (db/seed.log)"; else bad "$(tail -5 db/seed.log)"; die "seed failed"; fi

COUNT=$(node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();const n=await c.db('aics_portal').collection('students').countDocuments({});await c.close();console.log(n)})()")
[ "${COUNT:-0}" -ge 70 ] && ok "students docs seeded: ${COUNT} identities" || die "unexpectedly few identity docs (${COUNT:-0})"

# ---------------------------------------------------------------------
echo "== 3. dry-run (counts only, zero writes) =="
node scripts/rehash-passwords.ts > db/dryrun1.log 2>&1 || { bad "$(tail -5 db/dryrun1.log)"; die "dry-run errored"; }
cat db/dryrun1.log
TOTAL=$(sed -nE 's/.*\btotal=([0-9]+)\b.*/\1/p' db/dryrun1.log | head -1)
TODO_N=$(sed -nE 's/.*\bto-rehash=([0-9]+)\b.*/\1/p' db/dryrun1.log | head -1)
echo "  parsed: total=${TOTAL:-?} to-rehash=${TODO_N:-?}"
[ -n "$TOTAL" ] && [ -n "$TODO_N" ] && [ "$TODO_N" -gt 0 ] || die "dry-run parse failed"
[ "$TODO_N" = "$TOTAL" ] && ok "fresh plaintext state: to-rehash (${TODO_N}) == total (${TOTAL})" || bad "to-rehash ${TODO_N} != total ${TOTAL} (state not fully plaintext)"
grep -q '"faculty"' db/dryrun1.log && grep -q '"admin"' db/dryrun1.log && ok "per-role breakdown includes faculty + admin" || bad "per-role breakdown missing roles"

# ---------------------------------------------------------------------
echo "== 4. BACKUP_KEY + encrypted backup (AES-256-GCM) =="
openssl rand -hex 32 > "$KEY_FILE" && chmod 600 "$KEY_FILE" && ok "backup key generated (64 hex, chmod 600, ${KEY_FILE})"
export BACKUP_KEY="$(cat "$KEY_FILE")"
if node scripts/rehash-passwords.ts --backup-to "$BACKUP_FILE" > db/backup.log 2>&1; then
  grep -q 'backup ok' db/backup.log && ok "$(grep 'backup ok' db/backup.log)" || bad "backup ok line missing"
else
  bad "$(tail -3 db/backup.log)"; die "backup failed"
fi
[ -s "$BACKUP_FILE" ] && ok "ciphertext on disk: $(stat -c%s "$BACKUP_FILE") bytes" || die "backup file empty"

# ---------------------------------------------------------------------
echo "== 5. apply --expect ${TODO_N} --bump-tv (runbook step 4) =="
if node scripts/rehash-passwords.ts --apply --expect "$TODO_N" --bump-tv --backup "$BACKUP_FILE" > db/apply1.log 2>&1; then
  grep -q "verified ${TODO_N}/${TODO_N}" db/apply1.log && ok "self-verify: verified ${TODO_N}/${TODO_N}" || bad "verified line missing"
  grep -q 'remaining-plaintext=0' db/apply1.log && ok "remaining-plaintext=0" || bad "remaining-plaintext line missing"
  tail -3 db/apply1.log
else
  bad "$(tail -5 db/apply1.log)"; die "apply failed"
fi

# ---------------------------------------------------------------------
echo "== 5a. --expect guard negative test (must ABORT, zero writes) =="
if node scripts/rehash-passwords.ts --apply --expect $((TODO_N - 1)) --bump-tv --backup "$BACKUP_FILE" > db/guard.log 2>&1; then
  bad "guard did NOT fire — apply proceeded with a wrong count"
else
  grep -q 'ABORT' db/guard.log && grep -q 'live todo count' db/guard.log && ok "--expect guard fired live (wrong count -> abort before any write)" || bad "guard failed for another reason: $(tail -3 db/guard.log)"
fi
node scripts/rehash-passwords.ts > db/dryrun-guard.log 2>&1
TODOG=$(sed -nE 's/.*\bto-rehash=([0-9]+)\b.*/\1/p' db/dryrun-guard.log | head -1)
# State at this point is the POST-APPLY one (step 5 already hashed every doc),
# so the guard leaving it untouched means to-rehash stays 0.
[ "${TODOG:-x}" = "0" ] && ok "guard abort wrote nothing (post-apply state intact: to-rehash=0)" || bad "guard test changed state: to-rehash=${TODOG:-?} expected 0"

# ---------------------------------------------------------------------
echo "== 6. rollback drill (safety net proven in THIS environment) =="
if node scripts/rehash-passwords.ts --rollback --backup "$BACKUP_FILE" > db/rollback.log 2>&1; then
  grep -q "rollback done: restored=${TODO_N}/${TODO_N}" db/rollback.log && ok "rollback restored ${TODO_N}/${TODO_N}" || bad "rollback count mismatch: $(grep 'rollback done' db/rollback.log)"
else
  bad "$(tail -5 db/rollback.log)"; die "rollback failed"
fi
node scripts/rehash-passwords.ts > db/dryrun2.log 2>&1
TODO2=$(sed -nE 's/.*\bto-rehash=([0-9]+)\b.*/\1/p' db/dryrun2.log | head -1)
[ "${TODO2:-x}" = "$TODO_N" ] && ok "post-rollback dry-run: to-rehash back to ${TODO2} (state faithfully restored)" || bad "post-rollback to-rehash=${TODO2:-?} expected ${TODO_N}"

# ---------------------------------------------------------------------
echo "== 7. re-apply --expect ${TODO_N} --bump-tv =="
if node scripts/rehash-passwords.ts --apply --expect "$TODO_N" --bump-tv --backup "$BACKUP_FILE" > db/apply2.log 2>&1; then
  grep -q "verified ${TODO_N}/${TODO_N}" db/apply2.log && ok "re-apply self-verify ${TODO_N}/${TODO_N}" || bad "re-apply verified line missing"
  grep -q 'remaining-plaintext=0' db/apply2.log && ok "re-apply remaining-plaintext=0" || bad "re-apply remaining line missing"
else
  bad "$(tail -5 db/apply2.log)"; die "re-apply failed"
fi

# ---------------------------------------------------------------------
echo "== 8. runbook step 5 — belt-and-braces: --apply --expect 0 --bump-all =="
if node scripts/rehash-passwords.ts --apply --expect 0 --bump-all --backup "$BACKUP_FILE" > db/apply3.log 2>&1; then
  grep -q 'verified 0/0' db/apply3.log && ok "bump-all pass: verified 0/0" || bad "bump-all verified line missing"
  grep -q "bumped=${TOTAL}" db/apply3.log && ok "tokenVersion bumped on all ${TOTAL} docs (every session dies)" || bad "bumped count mismatch: $(grep 'bumped=' db/apply3.log)"
else
  bad "$(tail -5 db/apply3.log)"; die "bump-all failed"
fi

# ---------------------------------------------------------------------
echo "== 9. spot-check collection =="
SPOT=$(node -e '
const{MongoClient}=require("mongodb");
(async()=>{
  const c=new MongoClient("mongodb://127.0.0.1:27017");await c.connect();
  const col=c.db("aics_portal").collection("students");
  const total=await col.countDocuments({});
  const scrypt=await col.countDocuments({password:{$regex:"^scrypt\\$"}});
  const plain=await col.countDocuments({password:{$exists:true,$type:"string"},$nor:[{password:{$regex:"^scrypt\\$"}}]});
  const minTvArr=await col.find({},{projection:{tokenVersion:1,_id:0}}).sort({tokenVersion:1}).limit(1).toArray();
  console.log(JSON.stringify({total,scrypt,plain,minTv:minTvArr[0]?minTvArr[0].tokenVersion:null}));
  await c.close();
})().catch(e=>{console.error(e.message);process.exit(1)})
')
echo "  spot-check: ${SPOT}"
echo "$SPOT" | grep -q "\"total\":${TOTAL}" && echo "$SPOT" | grep -q "\"scrypt\":${TOTAL}" && ok "every one of ${TOTAL} passwords starts with scrypt$" || bad "scrypt coverage mismatch: ${SPOT}"
echo "$SPOT" | grep -q '"plain":0' && ok "zero plaintext passwords remain" || bad "plaintext remains: ${SPOT}"
echo "$SPOT" | grep -qE '"minTv":[1-9]' && ok "min tokenVersion >= 1 (all legacy sessions revoked)" || bad "tokenVersion not bumped: ${SPOT}"

# ---------------------------------------------------------------------
echo "== 10. real-app login checks (next dev on :${PORT}) =="
cat > .env.local <<EOF
MONGODB_URI=${MONGODB_URI}
MONGODB_DB=${MONGODB_DB}
AUTH_SECRET=${AUTH_SECRET}
EOF
ok ".env.local written for the dev server (gitignored)"

node_modules/.bin/next dev -p "$PORT" > db/next-dev.log 2>&1 &
DEV_PID=$!
UP=0; CODE=""
for i in $(seq 1 90); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "http://127.0.0.1:${PORT}/" 2>/dev/null || true)
  if [ -n "$CODE" ] && [ "$CODE" != "000" ]; then UP=1; break; fi
  sleep 1
done
if [ "$UP" = 1 ]; then ok "dev server up on :${PORT} (root http ${CODE})"; else bad "$(tail -5 db/next-dev.log 2>/dev/null)"; die "dev server never came up"; fi

login_code() {
  curl -s -D db/hdr.txt -o db/body.txt -w '%{http_code}' --max-time 90 \
    -X POST "http://127.0.0.1:${PORT}/api/auth/login" \
    -H 'Content-Type: application/json' -d "$1"
}

CODE=$(login_code '{"username":"juan.santos","password":"student123"}')
if [ "$CODE" = 200 ] && grep -q '"ok":true' db/body.txt && grep -qi '^set-cookie' db/hdr.txt; then
  ok "student login (juan.santos/student123) -> 200 + ok:true + session cookie"
else
  bad "student login -> ${CODE}: $(head -c 200 db/body.txt)"
fi

CODE=$(login_code '{"username":"m.reyes","password":"faculty123"}')
if [ "$CODE" = 200 ] && grep -q '"ok":true' db/body.txt; then
  ok "faculty login (m.reyes/faculty123) -> 200"
else
  bad "faculty login -> ${CODE}: $(head -c 200 db/body.txt)"
fi

CODE=$(login_code '{"username":"admin","password":"admin123"}')
if [ "$CODE" = 200 ] && grep -q '"ok":true' db/body.txt; then
  ok "admin login (admin/admin123) -> 200"
else
  bad "admin login -> ${CODE}: $(head -c 200 db/body.txt)"
fi

CODE=$(login_code '{"username":"juan.santos","password":"definitely-wrong"}')
if [ "$CODE" = 401 ] && grep -q '"ok":false' db/body.txt; then
  ok "wrong password -> 401 {ok:false} (no oracle leak)"
else
  bad "wrong password -> ${CODE}: $(head -c 200 db/body.txt)"
fi

# ---------------------------------------------------------------------
kill "$DEV_PID" 2>/dev/null || true; DEV_PID=""
sleep 1
kill "$MONGO_PID" 2>/dev/null || true; MONGO_PID=""

echo ""
echo "======================================================"
echo "REHEARSAL RESULT: ${PASS} passed / ${FAIL} failed"
echo "artifacts: ${BACKUP_FILE} + ${KEY_FILE} (sandbox-local, gitignored)"
echo "logs: db/*.log"
echo "======================================================"
[ "$FAIL" -eq 0 ]
