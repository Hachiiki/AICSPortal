#!/usr/bin/env bash
# =====================================================================
# verify-backfill-rehearsal.sh — full fresh-environment rehearsal of the
# A1 phase-2 professorUsername backfill runbook (issue #72).
#
# Proves, on a throwaway local mongod (NEVER a non-local host):
#   report -> inject test conditions -> strictness FAIL -> backup ->
#   apply (stamps eligible ONLY) -> report -> idempotency ->
#   --expect guard -> strictness partial -> rollback (exact pre-state) ->
#   re-apply -> fragment equivalence -> production firewall
#
# Test conditions injected into the seeded dev DB (then rolled back):
#   - 'Prof. Anna Lim' faculty account      -> 2 uniquely-eligible rows
#   - 'Engr. Roberto Cruz' faculty account
#     in branch novaliches                  -> 2 eligible + cross-branch
#   - TWO 'Engr. Carlos Santos' accounts    -> 1 ambiguous row (duplicate
#     names) — must NEVER be auto-assigned
#   - one 'Prof. Patricia Villanueva' row professorUsername=''  -> invalid
#   - one 'Engr. James Villanueva' row professorUsername='ghost.user'
#                                          -> orphaned stamp
#
# Safety assertions throughout:
#   - no student usernames / emails / doc ids in any backfill log
#   - no connection strings in any log; backup key never printed
#   - backup file is ciphertext-only (no plaintext markers)
#   - --apply/--rollback against a non-local host ABORT before connecting
#     unless --prod is passed; with --prod the failure output is scrubbed
#     of credentials and URIs
# =====================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

MONGO_TGZ_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian12-8.0.12.tgz"
MONGO_DIR="db/mongodb-linux-x86_64-debian12-8.0.12"
MONGO_BIN="${MONGO_DIR}/bin/mongod"
DBPATH="db/data-backfill"
RDIR="db/backfill-rehearsal"
BACKUP_FILE="${RDIR}/subjects-backfill.json.enc"
KEY_FILE="${RDIR}/aics-backfill.key"
# The rehearsal NEVER leaves localhost — no non-local URI is used for data.
export MONGODB_URI="mongodb://127.0.0.1:27017"
export MONGODB_DB="aics_portal"

PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
die() { echo "  ABORT: $1 (passed=${PASS} failed=${FAIL})"; exit 2; }

MONGO_PID=""
cleanup() {
  if [ -n "$MONGO_PID" ]; then kill "$MONGO_PID" 2>/dev/null || true; fi
  pkill -f "mongod --dbpath ${DBPATH}" 2>/dev/null || true
  return 0
}
trap cleanup EXIT

# Count rows matching a mongo filter (JSON on stdin).
mcount() { node -e '
const{MongoClient}=require("mongodb");
(async()=>{
  const c=new MongoClient(process.env.MONGODB_URI);await c.connect();
  const n=await c.db(process.env.MONGODB_DB).collection("subjects").countDocuments(JSON.parse(require("fs").readFileSync(0,"utf8")));
  console.log(n);await c.close();
})().catch(e=>{console.error(e.message);process.exit(1)})'; }

# PII / secret-leak guard: none of these may appear in backfill logs.
pii_guard() {
  local logf="$1" label="$2"
  if grep -qE 'juan\.santos|maria\.cruz|jose\.garcia|pedro\.vasquez|ana\.castillo|ben\.mendoza|@aics\.edu\.ph' "$logf"; then
    bad "${label}: PII leak (student username or email) in $(basename "$logf")"
  else
    ok "${label}: no student PII in $(basename "$logf")"
  fi
  if grep -qE 'mongodb(\+srv)?://' "$logf"; then
    bad "${label}: connection string printed in $(basename "$logf")"
  else
    ok "${label}: no connection string in $(basename "$logf")"
  fi
}

# ---------------------------------------------------------------------
echo "== 0. preflight =="
for d in node_modules/mongodb node_modules/dotenv; do
  if [ -d "$d" ]; then ok "dependency present: $d"; else bad "dependency missing: $d"; fi
done
[ -d node_modules/mongodb ] && [ -d node_modules/dotenv ] || die "node_modules incomplete"

mkdir -p "$RDIR"
# Prove we are testing the COMMITTED artifacts, not a dirty working tree.
for f in scripts/backfill-professor-username.ts scripts/seed-mongodb.ts; do
  if git diff --quiet HEAD -- "$f" && git show HEAD:"$f" | diff -q - "$f" >/dev/null 2>&1; then
    ok "committed artifact verified: $f"
  else
    die "working tree differs from HEAD for $f — commit first (rehearsal tests the committed tool)"
  fi
done
echo "  node $(node --version)"

# ---------------------------------------------------------------------
echo "== 1. provision + boot mongod 8.0.12 (throwaway, dbpath ${DBPATH}) =="
if [ ! -x "$MONGO_BIN" ]; then
  echo "  downloading mongod tarball (~90MB)..."
  curl -sL --retry 3 --max-time 300 -o db/mongod.tgz "$MONGO_TGZ_URL" || die "mongod download failed"
  tar -xzf db/mongod.tgz -C db/ || die "mongod extract failed"
fi
[ -x "$MONGO_BIN" ] && ok "mongod binary present: $("$MONGO_BIN" --version | head -1)" || die "mongod binary missing"

pkill -f "mongod --dbpath ${DBPATH}" 2>/dev/null || true
rm -rf "$DBPATH"; mkdir -p "$DBPATH"
"$MONGO_BIN" --dbpath "$DBPATH" --port 27017 --bind_ip 127.0.0.1 --quiet > "$RDIR/mongod.log" 2>&1 &
MONGO_PID=$!
UP=0
for i in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && { UP=1; break; }
  sleep 1
done
if [ "$UP" = 1 ] && kill -0 "$MONGO_PID" 2>/dev/null; then ok "mongod up (pid $MONGO_PID)"; else bad "$(tail -5 "$RDIR/mongod.log" 2>/dev/null)"; die "mongod did not start"; fi

# ---------------------------------------------------------------------
echo "== 2. seed — current seed (post-phase-1: dual-write stamps present) =="
node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();await c.db('aics_portal').dropDatabase().catch(()=>{});await c.close()})()" || die "drop failed"
if MONGODB_URI=mongodb://127.0.0.1:27017 MONGODB_DB=aics_portal node scripts/seed-mongodb.ts > "$RDIR/seed.log" 2>&1; then
  ok "seed completed (${RDIR}/seed.log)"
else
  bad "$(tail -5 "$RDIR/seed.log")"; die "seed failed"
fi

TOTAL=$(node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();const n=await c.db('aics_portal').collection('subjects').countDocuments({});await c.close();console.log(n)})()")
[ "${TOTAL:-0}" -ge 90 ] && ok "subjects docs seeded: ${TOTAL} rows" || die "unexpectedly few subject rows (${TOTAL:-0})"
FACN=$(node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();const n=await c.db('aics_portal').collection('students').countDocuments({role:'faculty'});await c.close();console.log(n)})()")
[ "${FACN:-0}" = 2 ] && ok "faculty accounts: ${FACN} (m.reyes, l.bautista — the only name-resolvable identities)" || die "expected exactly 2 seeded faculty accounts, found ${FACN:-0}"

# ---------------------------------------------------------------------
echo "== 3. baseline report (read-only, zero writes) =="
node scripts/backfill-professor-username.ts > "$RDIR/report-baseline.log" 2>&1 || { bad "$(tail -5 "$RDIR/report-baseline.log")"; die "baseline report errored"; }
cat "$RDIR/report-baseline.log"
S0=$(sed -nE 's/.*\bstamped=([0-9]+)\b.*/\1/p' "$RDIR/report-baseline.log" | head -1)
U0=$(sed -nE 's/.*\bunresolved=([0-9]+)\b.*/\1/p' "$RDIR/report-baseline.log" | head -1)
E0=$(sed -nE 's/.*\beligible=([0-9]+)\b.*/\1/p' "$RDIR/report-baseline.log" | head -1)
A0=$(sed -nE 's/.*\bambiguous=([0-9]+)\b.*/\1/p' "$RDIR/report-baseline.log" | head -1)
O0=$(sed -nE 's/.*\borphaned-stamps=([0-9]+)\b.*/\1/p' "$RDIR/report-baseline.log" | head -1)
Z0=$(sed -nE 's/.*\binvalid-empty=([0-9]+)\b.*/\1/p' "$RDIR/report-baseline.log" | head -1)
grep -q 'host: local' "$RDIR/report-baseline.log" && ok "host classified local, URI not printed" || bad "host line missing"
[ "${E0:-x}" = 0 ] && [ "${A0:-x}" = 0 ] && [ "${O0:-x}" = 0 ] && [ "${Z0:-x}" = 0 ] \
  && ok "fresh seed: eligible=0 ambiguous=0 orphaned=0 invalid=0 (stamped=${S0} unresolved=${U0})" \
  || bad "fresh seed not clean: eligible=${E0:-?} ambiguous=${A0:-?} orphaned=${O0:-?} invalid=${Z0:-?}"
[ "${U0:-0}" -gt 0 ] && ok "unresolved=${U0} rows reported (6 unresolvable professor names — left alone)" || bad "expected unresolved>0 on fresh seed"
pii_guard "$RDIR/report-baseline.log" "baseline report"

# Fresh seed is strictness-clean (unresolved is informational, not a gate).
node scripts/backfill-professor-username.ts --strictness > "$RDIR/strictness-baseline.log" 2>&1
RC=$?
[ "$RC" = 0 ] && grep -q 'strictness: PASS' "$RDIR/strictness-baseline.log" \
  && ok "strictness on fresh seed: PASS exit 0 (gates A/B/C all 0)" \
  || bad "strictness on fresh seed: exit ${RC}, $(grep 'strictness:' "$RDIR/strictness-baseline.log" 2>/dev/null)"

# ---------------------------------------------------------------------
echo "== 4. inject test conditions (duplicate names, cross-branch, dead values) =="
node > "$RDIR/inject.log" 2>&1 <<'EOF'
const { MongoClient } = require('mongodb')
;(async () => {
  const c = new MongoClient('mongodb://127.0.0.1:27017'); await c.connect()
  const st = c.db('aics_portal').collection('students')
  const su = c.db('aics_portal').collection('subjects')
  const mk = (branch, username, fullName) => ({
    branch, username, password: 'scrypt$rehearsal-placeholder', tokenVersion: 0,
    role: 'faculty', fullName, firstName: fullName, lastName: fullName,
    studentNumber: 'RH-' + username, email: '', documents: [],
  })
  await st.insertMany([
    mk('commonwealth', 'a.lim',   'Prof. Anna Lim'),        // uniquely eligible
    mk('commonwealth', 'c.santos',   'Engr. Carlos Santos'), // duplicate name …
    mk('commonwealth', 'c.santos.dup','Engr. Carlos Santos'), // … two accounts
    mk('novaliches',   'r.cruz',  'Engr. Roberto Cruz'),    // eligible, cross-branch
  ])
  // invalid dead value: '' matches neither ownership arm
  await su.updateOne({ professor: 'Prof. Patricia Villanueva', professorUsername: null }, { $set: { professorUsername: '' } })
  // orphaned stamp: username no account has
  await su.updateOne({ professor: 'Engr. James Villanueva', professorUsername: null }, { $set: { professorUsername: 'ghost.user' } })
  await c.close()
  console.log('injected')
})().catch(e => { console.error(e.message); process.exit(1) })
EOF
grep -q injected "$RDIR/inject.log" && ok "conditions injected (a.lim, c.santos x2, r.cruz@novaliches, ''-row, ghost.user-row)" || { bad "$(tail -5 "$RDIR/inject.log")"; die "injection failed"; }

AL=$(mcount <<'J'
{ "professor": "Prof. Anna Lim", "professorUsername": null }
J
)
RC_N=$(mcount <<'J'
{ "professor": "Engr. Roberto Cruz", "professorUsername": null }
J
)
CS=$(mcount <<'J'
{ "professor": "Engr. Carlos Santos", "professorUsername": null }
J
)
E=$((AL + RC_N))
echo "  live-derived: anna-lim=${AL} roberto-cruz=${RC_N} carlos-santos(ambiguous)=${CS} -> expect eligible=${E}"
[ "${AL:-0}" = 2 ] && [ "${RC_N:-0}" = 2 ] && [ "${CS:-0}" = 1 ] \
  && ok "injection landed on the intended rows (2+2 eligible, 1 ambiguous)" \
  || bad "seed drift: anna-lim=${AL:-?} roberto-cruz=${RC_N:-?} carlos-santos=${CS:-?} (assertions below use live numbers)"

# ---------------------------------------------------------------------
echo "== 5. report with conditions (read-only) + --list-names =="
node scripts/backfill-professor-username.ts > "$RDIR/report-dirty.log" 2>&1 || { bad "$(tail -5 "$RDIR/report-dirty.log")"; die "dirty report errored"; }
cat "$RDIR/report-dirty.log"
E1=$(sed -nE 's/.*\beligible=([0-9]+)\b.*/\1/p' "$RDIR/report-dirty.log" | head -1)
A1_=$(sed -nE 's/.*\bambiguous=([0-9]+)\b.*/\1/p' "$RDIR/report-dirty.log" | head -1)
U1=$(sed -nE 's/.*\bunresolved=([0-9]+)\b.*/\1/p' "$RDIR/report-dirty.log" | head -1)
O1=$(sed -nE 's/.*\borphaned-stamps=([0-9]+)\b.*/\1/p' "$RDIR/report-dirty.log" | head -1)
Z1=$(sed -nE 's/.*\binvalid-empty=([0-9]+)\b.*/\1/p' "$RDIR/report-dirty.log" | head -1)
X1=$(sed -nE 's/.*\beligible-cross-branch=([0-9]+)\b.*/\1/p' "$RDIR/report-dirty.log" | head -1)
[ "${E1:-x}" = "$E" ] && ok "eligible=${E1} (anna-lim + roberto-cruz)" || bad "eligible=${E1:-?} expected ${E}"
[ "${A1_:-x}" = "$CS" ] && ok "ambiguous=${A1_} (duplicate 'Engr. Carlos Santos' accounts)" || bad "ambiguous=${A1_:-?} expected ${CS}"
[ "${O1:-x}" = 1 ] && ok "orphaned-stamps=${O1} (ghost.user)" || bad "orphaned=${O1:-?} expected 1"
[ "${Z1:-x}" = 1 ] && ok "invalid-empty=${Z1} (dead '' value)" || bad "invalid=${Z1:-?} expected 1"
[ "${X1:-x}" = "$RC_N" ] && ok "eligible-cross-branch=${X1} (roberto-cruz account lives in novaliches)" || bad "cross-branch=${X1:-?} expected ${RC_N}"
EXP_U=$((U0 - AL - RC_N - CS - 2))
[ "${U1:-x}" = "$EXP_U" ] && ok "unresolved=${U1} (baseline ${U0} minus eligible/ambiguous/invalid/orphan injections)" || bad "unresolved=${U1:-?} expected ${EXP_U}"
pii_guard "$RDIR/report-dirty.log" "dirty report"

node scripts/backfill-professor-username.ts --list-names > "$RDIR/report-names.log" 2>&1 || die "list-names errored"
grep -q '"Engr. Carlos Santos"' "$RDIR/report-names.log" && ok "--list-names: ambiguous names list the duplicate name" || bad "ambiguous-names missing the duplicate"
if grep -qE 'juan\.santos|@aics\.edu\.ph' "$RDIR/report-names.log"; then
  bad "--list-names leaked student data"
else
  ok "--list-names: professor display names only, no student data"
fi

# ---------------------------------------------------------------------
echo "== 6. strictness BEFORE backfill: all three gates FAIL (exit 3) =="
node scripts/backfill-professor-username.ts --strictness > "$RDIR/strictness-dirty.log" 2>&1
RC=$?
cat "$RDIR/strictness-dirty.log"
[ "$RC" = 3 ] && ok "strictness exit code 3 (dirty state refuses)" || bad "strictness exit ${RC}, expected 3"
grep -q 'gate-A unstamped-uniquely-resolvable: [1-9].*FAIL' "$RDIR/strictness-dirty.log" && ok "gate-A FAIL (eligible rows pending)" || bad "gate-A did not fail"
grep -q 'gate-B ambiguous-names: [1-9].*FAIL' "$RDIR/strictness-dirty.log" && ok "gate-B FAIL (ambiguous blocks phase 3)" || bad "gate-B did not fail"
grep -q 'gate-C orphaned-stamps: [1-9].*FAIL' "$RDIR/strictness-dirty.log" && ok "gate-C FAIL (orphaned stamp blocks phase 3)" || bad "gate-C did not fail"
pii_guard "$RDIR/strictness-dirty.log" "strictness dirty"

# ---------------------------------------------------------------------
echo "== 7. BACKUP_KEY + encrypted backup (AES-256-GCM) =="
openssl rand -hex 32 > "$KEY_FILE" && chmod 600 "$KEY_FILE" && ok "backup key generated (64 hex, chmod 600, ${KEY_FILE})"
export BACKUP_KEY="$(cat "$KEY_FILE")"
if node scripts/backfill-professor-username.ts --backup-to "$BACKUP_FILE" > "$RDIR/backup.log" 2>&1; then
  grep -q 'backup ok' "$RDIR/backup.log" && ok "$(grep 'backup ok' "$RDIR/backup.log")" || bad "backup ok line missing"
else
  bad "$(tail -3 "$RDIR/backup.log")"; die "backup failed"
fi
[ -s "$BACKUP_FILE" ] && ok "ciphertext on disk: $(stat -c%s "$BACKUP_FILE") bytes" || die "backup file empty"
if grep -q 'professorUsername' "$BACKUP_FILE" || grep -q 'juan' "$BACKUP_FILE"; then
  bad "backup file contains plaintext markers"
else
  ok "backup file is ciphertext (no plaintext field names or usernames)"
fi
pii_guard "$RDIR/backup.log" "backup"
if grep -rq "$BACKUP_KEY" "$RDIR"/*.log; then bad "BACKUP_KEY value leaked into a log"; else ok "BACKUP_KEY never printed in any log"; fi

# ---------------------------------------------------------------------
echo "== 8. apply --expect ${E} — stamps eligible ONLY =="
if node scripts/backfill-professor-username.ts --apply --expect "$E" --backup "$BACKUP_FILE" > "$RDIR/apply1.log" 2>&1; then
  grep -q "verified ${E}/${E}" "$RDIR/apply1.log" && ok "self-verify: verified ${E}/${E}" || bad "verified line missing"
  grep -q 'eligible-remaining=0' "$RDIR/apply1.log" && ok "eligible-remaining=0" || bad "eligible-remaining line missing"
  grep -q "never-assigned: ambiguous=${CS} unresolved=${EXP_U}" "$RDIR/apply1.log" && ok "never-assigned line reports ambiguous+unresolved left unstamped" || bad "never-assigned line missing/wrong"
  tail -3 "$RDIR/apply1.log"
else
  bad "$(tail -5 "$RDIR/apply1.log")"; die "apply failed"
fi
pii_guard "$RDIR/apply1.log" "apply"

ST1=$(mcount <<'J'
{ "professor": "Prof. Anna Lim", "professorUsername": "a.lim" }
J
)
ST2=$(mcount <<'J'
{ "professor": "Engr. Roberto Cruz", "professorUsername": "r.cruz" }
J
)
AMB_STILL=$(mcount <<'J'
{ "professor": "Engr. Carlos Santos", "professorUsername": null }
J
)
INV_STILL=$(mcount <<'J'
{ "professorUsername": "" }
J
)
ORPH_STILL=$(mcount <<'J'
{ "professorUsername": "ghost.user" }
J
)
[ "${ST1:-0}" = "$AL" ] && ok "anna-lim rows stamped a.lim: ${ST1}/${AL}" || bad "anna-lim stamped=${ST1:-?} expected ${AL}"
[ "${ST2:-0}" = "$RC_N" ] && ok "roberto-cruz rows stamped r.cruz: ${ST2}/${RC_N} (cross-branch stamp works)" || bad "roberto-cruz stamped=${ST2:-?} expected ${RC_N}"
[ "${AMB_STILL:-x}" = "$CS" ] && ok "HARD GUARANTEE: ambiguous rows still unstamped (${AMB_STILL}/${CS}) — never auto-assigned" || bad "ambiguous rows were stamped (${AMB_STILL} expected ${CS} unstamped)"
[ "${INV_STILL:-x}" = 1 ] && ok "invalid '' row untouched" || bad "invalid row changed (${INV_STILL:-?})"
[ "${ORPH_STILL:-x}" = 1 ] && ok "orphaned ghost.user row untouched" || bad "orphaned row changed (${ORPH_STILL:-?})"

# Fragment equivalence: the runtime ownership filter must match the SAME
# rows before and after the backfill for every actor (pre counts = post).
FRAG_AL=$(mcount <<'J'
{ "$or": [ { "professorUsername": "a.lim" }, { "professorUsername": null, "professor": "Prof. Anna Lim" } ] }
J
)
FRAG_RC=$(mcount <<'J'
{ "$or": [ { "professorUsername": "r.cruz" }, { "professorUsername": null, "professor": "Engr. Roberto Cruz" } ] }
J
)
FRAG_MR=$(mcount <<'J'
{ "$or": [ { "professorUsername": "m.reyes" }, { "professorUsername": null, "professor": "Engr. Maria Cristina Reyes" } ] }
J
)
[ "${FRAG_AL:-0}" = "$AL" ] && ok "fragment equivalence a.lim: ${FRAG_AL} rows (was ${AL} by name arm)" || bad "fragment a.lim=${FRAG_AL:-?} expected ${AL}"
[ "${FRAG_RC:-0}" = "$RC_N" ] && ok "fragment equivalence r.cruz: ${FRAG_RC} rows (was ${RC_N} by name arm)" || bad "fragment r.cruz=${FRAG_RC:-?} expected ${RC_N}"
echo "  fragment m.reyes (untouched by backfill): ${FRAG_MR:-?} rows — seed-stamped rows unaffected"

# ---------------------------------------------------------------------
echo "== 9. idempotency — rerun --apply --expect 0 =="
if node scripts/backfill-professor-username.ts --apply --expect 0 --backup "$BACKUP_FILE" > "$RDIR/apply2.log" 2>&1; then
  grep -q 'verified 0/0' "$RDIR/apply2.log" && ok "idempotent rerun: verified 0/0, zero writes" || bad "idempotent rerun verified line missing: $(grep verified "$RDIR/apply2.log")"
else
  bad "$(tail -5 "$RDIR/apply2.log")"; die "idempotent rerun failed"
fi

# ---------------------------------------------------------------------
echo "== 10. --expect guard negative test (must ABORT, zero writes) =="
if node scripts/backfill-professor-username.ts --apply --expect "$E" --backup "$BACKUP_FILE" > "$RDIR/guard.log" 2>&1; then
  bad "guard did NOT fire — apply proceeded with a wrong count"
else
  grep -q 'ABORT' "$RDIR/guard.log" && grep -q 'live eligible count' "$RDIR/guard.log" \
    && ok "--expect guard fired live (wrong count -> abort before any write)" \
    || bad "guard failed for another reason: $(tail -3 "$RDIR/guard.log")"
fi
E2=$(node scripts/backfill-professor-username.ts 2>/dev/null | sed -nE 's/.*\beligible=([0-9]+)\b.*/\1/p' | head -1)
[ "${E2:-x}" = 0 ] && ok "guard abort wrote nothing (eligible still 0)" || bad "guard test changed state: eligible=${E2:-?}"

# ---------------------------------------------------------------------
echo "== 11. strictness AFTER apply: gate A passes, B and C still block =="
node scripts/backfill-professor-username.ts --strictness > "$RDIR/strictness-post.log" 2>&1
RC=$?
cat "$RDIR/strictness-post.log"
[ "$RC" = 3 ] && ok "strictness exit 3 (ambiguous + orphaned still block)" || bad "strictness exit ${RC}, expected 3"
grep -q 'gate-A unstamped-uniquely-resolvable: 0 PASS' "$RDIR/strictness-post.log" && ok "gate-A PASS after backfill" || bad "gate-A did not pass"
grep -q 'gate-B ambiguous-names: [1-9].*FAIL' "$RDIR/strictness-post.log" && ok "gate-B still FAIL (manual resolution required)" || bad "gate-B unexpectedly passed"
grep -q 'gate-C orphaned-stamps: [1-9].*FAIL' "$RDIR/strictness-post.log" && ok "gate-C still FAIL (manual fix required)" || bad "gate-C unexpectedly passed"

# ---------------------------------------------------------------------
echo "== 12. rollback drill — exact pre-state restore =="
if node scripts/backfill-professor-username.ts --rollback --backup "$BACKUP_FILE" > "$RDIR/rollback.log" 2>&1; then
  grep -q "rollback done: restored=${E}" "$RDIR/rollback.log" && ok "rollback restored=${E}/${E} stamped rows (others already at pre-state)" || bad "rollback count mismatch: $(grep 'rollback done' "$RDIR/rollback.log")"
else
  bad "$(tail -5 "$RDIR/rollback.log")"; die "rollback failed"
fi
pii_guard "$RDIR/rollback.log" "rollback"
node scripts/backfill-professor-username.ts > "$RDIR/report-postrollback.log" 2>&1
if diff <(grep -E '^(subjects:|unstamped:|eligible-cross-branch=)' "$RDIR/report-dirty.log") \
        <(grep -E '^(subjects:|unstamped:|eligible-cross-branch=)' "$RDIR/report-postrollback.log") >/dev/null; then
  ok "post-rollback report IDENTICAL to pre-apply report (full-fidelity restore)"
else
  bad "post-rollback report differs:"
  diff <(grep -E '^(subjects:|unstamped:|eligible-cross-branch=)' "$RDIR/report-dirty.log") \
       <(grep -E '^(subjects:|unstamped:|eligible-cross-branch=)' "$RDIR/report-postrollback.log") | sed 's/^/    /'
fi
AL_BACK=$(mcount <<'J'
{ "professor": "Prof. Anna Lim", "professorUsername": null }
J
)
INV_BACK=$(mcount <<'J'
{ "professorUsername": "" }
J
)
ORPH_BACK=$(mcount <<'J'
{ "professorUsername": "ghost.user" }
J
)
[ "${AL_BACK:-0}" = "$AL" ] && ok "anna-lim rows unstamped again (${AL_BACK}/${AL}) — the unset operator restores the absent field" || bad "anna-lim unstamped=${AL_BACK:-?} expected ${AL}"
[ "${INV_BACK:-x}" = 1 ] && ok "'' dead value preserved through rollback" || bad "'' row lost by rollback (${INV_BACK:-?})"
[ "${ORPH_BACK:-x}" = 1 ] && ok "ghost.user orphan preserved through rollback" || bad "ghost row lost by rollback (${ORPH_BACK:-?})"

# ---------------------------------------------------------------------
echo "== 13. re-apply --expect ${E} (the real flow after a rollback) =="
if node scripts/backfill-professor-username.ts --apply --expect "$E" --backup "$BACKUP_FILE" > "$RDIR/apply3.log" 2>&1; then
  grep -q "verified ${E}/${E}" "$RDIR/apply3.log" && ok "re-apply self-verify ${E}/${E}" || bad "re-apply verified line missing"
  grep -q 'eligible-remaining=0' "$RDIR/apply3.log" && ok "re-apply eligible-remaining=0" || bad "re-apply remaining line missing"
else
  bad "$(tail -5 "$RDIR/apply3.log")"; die "re-apply failed"
fi

# ---------------------------------------------------------------------
echo "== 14. production firewall — mutations refuse non-local targets =="
FW_URI='mongodb+srv://rehearsal-user:rehearsal-pass@fw-test.invalid/aics_portal'
if MONGODB_URI="$FW_URI" node scripts/backfill-professor-username.ts --apply --expect 0 --backup "$BACKUP_FILE" > "$RDIR/fw-apply.log" 2>&1; then
  bad "firewall did NOT fire for --apply against non-local host"
else
  grep -q 'refusing to mutate a non-local target' "$RDIR/fw-apply.log" \
    && ok "--apply vs non-local (no --prod): ABORT before connecting" \
    || bad "firewall message missing: $(tail -3 "$RDIR/fw-apply.log")"
  grep -qE 'MongoServerSelection|ENOTFOUND|getaddrinfo' "$RDIR/fw-apply.log" \
    && bad "firewall aborted only AFTER a connection attempt" \
    || ok "no connection attempted (guard precedes connect)"
fi
if MONGODB_URI="$FW_URI" node scripts/backfill-professor-username.ts --rollback --backup "$BACKUP_FILE" > "$RDIR/fw-rollback.log" 2>&1; then
  bad "firewall did NOT fire for --rollback against non-local host"
else
  grep -q 'refusing to mutate a non-local target' "$RDIR/fw-rollback.log" \
    && ok "--rollback vs non-local (no --prod): ABORT before connecting" \
    || bad "firewall message missing for rollback"
fi
if grep -q 'rehearsal-pass' "$RDIR/fw-apply.log" "$RDIR/fw-rollback.log"; then
  bad "credentials from the URI echoed into a log"
else
  ok "credentials never echoed (URI never printed)"
fi
# With --prod the connection IS attempted (owner-approved prod run); here it
# must fail on DNS and the scrubber must keep credentials/URIs out of stderr.
if timeout 60 env MONGODB_URI="$FW_URI" node scripts/backfill-professor-username.ts --apply --expect 0 --backup "$BACKUP_FILE" --prod > "$RDIR/fw-prod.log" 2>&1; then
  bad "--prod against an invalid host unexpectedly succeeded"
else
  grep -q 'Backfill failed' "$RDIR/fw-prod.log" && ok "--prod proceeds to connect and fails cleanly (invalid host)" || ok "--prod failed (non-zero) as expected"
fi
if grep -q 'rehearsal-pass' "$RDIR/fw-prod.log"; then
  bad "SCRUB FAILURE: credentials visible in --prod failure output"
elif grep -qE 'mongodb(\+srv)?://rehearsal-user' "$RDIR/fw-prod.log"; then
  bad "SCRUB FAILURE: connection string visible in --prod failure output"
else
  ok "scrubber: no credentials, no URI in the --prod failure output"
fi

# ---------------------------------------------------------------------
kill "$MONGO_PID" 2>/dev/null || true; MONGO_PID=""

echo ""
echo "======================================================"
echo "BACKFILL REHEARSAL RESULT: ${PASS} passed / ${FAIL} failed"
echo "artifacts: ${BACKUP_FILE} + ${KEY_FILE} (sandbox-local, gitignored)"
echo "logs: ${RDIR}/*.log"
echo "======================================================"
[ "$FAIL" -eq 0 ]
