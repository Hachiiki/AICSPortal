#!/usr/bin/env bash
# =====================================================================
# verify-rotate-rehearsal.sh — full fresh-environment rehearsal of the
# demo-credential rotation runbook
# (docs/authz/credential-rotation-runbook.md) for
# scripts/rotate-demo-credentials.ts on dev/credential-rotation-prep.
#
# First executed: 2026-10-23 (credential-rotation review follow-up,
# findings F1/F2/F3 hardening).
#
# Runs in ONE invocation on purpose: background processes do not survive
# between shell sessions in this environment. The rehearsal NEVER leaves
# localhost — no Atlas URI is ever used here (the F2 guard tests use a
# reserved .invalid hostname that cannot resolve).
#
# Sequence:
#   0. preflight — node, bun, mongod binary, node_modules
#   0.5 unit tests (bun test scripts/lib/) — F2 hostname classification
#   1. throwaway mongod on 127.0.0.1:29100, db aics_portal_rehearsal
#   2. seed (localhost path) — 83 value carriers + rogue.role anomaly
#   2a. F2 behavioral: remote URI aborts PRE-CONNECT (no DNS attempted);
#       deceptive URI (credentials containing 'localhost') aborts too;
#       remote URI + DEMO_PW_* env passes the guard (fails later at DNS)
#   3. dry plan — MATCHED TOTAL 83 + anomaly line; write-canary armed
#   4. encrypted backup — ciphertext-only asserted
#   5. NEGATIVE preflight tests (each must ABORT with ZERO writes —
#      canary-checked after every one):
#        N1 --apply without DEMO_ROTATE_SANCTIONED
#        N2 --rollback without sanction            (F3)
#        N3 --rollback with invalid sanction values (0/true/empty) (F3)
#        N4 --apply with wrong BACKUP_KEY          (F1)
#        N5 --apply with byte-corrupted backup     (F1)
#        N6 --apply with count-mismatched backup   (F1)
#        N7 --apply with id-uncovered backup       (F1)
#        N8 --apply with wrong --expect
#   6. POSITIVE: sanctioned --apply (expect 83, --allow-mismatch for the
#      seeded rogue.role fixture) — 83/83 UPDATED + VERIFIED
#   7. post-state: matched 0, tvNonzero 83 (every session dead)
#   8. sanctioned --rollback — 83/83 restored
#   9. post-state: matched 83, tvNonzero 0 (pre-state restored)
#  10. PARTIAL-FAILURE drill: fresh backup + apply, revert 41 docs to the
#      old defaults (simulated mid-run crash), then sanctioned rollback
#      restores all 83 — recovery from a half-rotated state
#  11. cleanup: mongod down, throwaway data + backups removed
# =====================================================================
set -uo pipefail
cd "$(dirname "$0")/.."

MONGO_BIN="db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"
WORKDIR="$(pwd)/db/rotate-rehearsal" # absolute — mongod --fork chdirs to /
DBPATH="${WORKDIR}/data"
BACKUP="${WORKDIR}/demo-creds.json.enc"
BACKUP2="${WORKDIR}/demo-creds-2.json.enc"
BACKUP_SHORT="${WORKDIR}/demo-creds-short.json.enc"
BACKUP_SWAPPED="${WORKDIR}/demo-creds-swapid.json.enc"
BACKUP_CORRUPT="${WORKDIR}/demo-creds-corrupt.json.enc"
PORT="29100"
export MONGODB_URI="mongodb://127.0.0.1:${PORT}"
export MONGODB_DB="aics_portal_rehearsal"
# DEMO_PW_* and DEMO_ROTATE_SANCTIONED are NOT exported: every invocation
# passes exactly the env it needs inline. Exporting them globally would
# leak the rehearsal's replacement values into the local SEED step (the
# seed honors DEMO_PW_* on localhost targets too) and into the F2 guard
# tests (which must run with them absent).
ROTATE="node --experimental-strip-types scripts/rotate-demo-credentials.ts"
STATE="node --experimental-strip-types scripts/lib/rehearsal-state.ts"
NEWVALUES=(DEMO_PW_STUDENT="R3hearsalStu!9" DEMO_PW_FACULTY="R3hearsalFac!9" DEMO_PW_ADMIN="R3hearsalAdm!9")
KEY=""

PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
die() { echo "  ABORT: $1 (passed=${PASS} failed=${FAIL})"; exit 2; }

cleanup() {
  if [ -f "${WORKDIR}/mongod.pid" ]; then
    kill "$(cat "${WORKDIR}/mongod.pid")" 2>/dev/null || true
  fi
  pkill -f "mongod --dbpath ${DBPATH}" 2>/dev/null || true
  rm -rf "${WORKDIR}"
  return 0
}
trap cleanup EXIT

node -e "console.error('')" >/dev/null 2>&1 || die "node is not available"
command -v bun >/dev/null 2>&1 || die "bun is not available"
[ -x "${MONGO_BIN}" ] || die "mongod binary missing at ${MONGO_BIN} (see scripts/verify-rehash-rehearsal.sh provisioning)"
[ -d node_modules/.bin ] || die "node_modules missing — install dependencies first"

echo "== 0.5 rotation-guard unit tests (bun test scripts/lib/) =="
if bun test scripts/lib/ 2>&1 | grep -q " 0 fail"; then
  ok "uri-local unit tests pass"
else
  bad "uri-local unit tests FAILED"
  die "unit tests must pass before the behavioral rehearsal"
fi

echo "== 1. throwaway mongod on 127.0.0.1:${PORT} =="
mkdir -p "${DBPATH}"
if lsof -i :"${PORT}" >/dev/null 2>&1; then die "port ${PORT} already in use"; fi
"${MONGO_BIN}" --dbpath "${DBPATH}" --port "${PORT}" --bind_ip 127.0.0.1 \
  --fork --logpath "${WORKDIR}/mongod.log" --pidfilepath "${WORKDIR}/mongod.pid" \
  >/dev/null 2>&1 || die "mongod failed to start (log: ${WORKDIR}/mongod.log)"
ok "mongod up (pid $(cat "${WORKDIR}/mongod.pid"))"

echo "== 2. seed (localhost path — 83 value carriers expected) =="
SEED_LOG=$(node --experimental-strip-types scripts/seed-mongodb.ts 2>&1)
echo "$SEED_LOG" | grep -q "Seed complete!" && ok "seed completed" || bad "seed did not complete"
echo "$SEED_LOG" | grep -q "documented defaults" && ok "seed used documented defaults locally (pwLabel, no values printed)" || bad "seed password label missing"
echo "$SEED_LOG" | grep -qE "student123|faculty123|admin123" && bad "seed logs printed a password VALUE" || ok "seed logs printed no password values"

echo "== 2a. F2 behavioral: remote-seed guard =="
# Reserved .invalid TLD (RFC 2606) — guaranteed unresolvable, no real host.
# serverSelectionTimeoutMS=2000 makes the connect fail FAST so the output
# is captured well inside the timeout (a vacuous empty capture would make
# the assertions below meaningless).
F2URI="mongodb://user:secret@rehearsal-remote.invalid:27017/?serverSelectionTimeoutMS=2000&connectTimeoutMS=2000"
F2A=$(env -u DEMO_PW_STUDENT -u DEMO_PW_FACULTY -u DEMO_PW_ADMIN \
  MONGODB_URI="${F2URI}" MONGODB_DB="aics_portal_rehearsal" \
  timeout 30 node --experimental-strip-types scripts/seed-mongodb.ts 2>&1)
if echo "$F2A" | grep -q "ABORT: seeding a REMOTE database"; then
  ok "remote URI without DEMO_PW_* aborts at the guard"
else
  bad "remote URI without env did not abort at the guard"
fi
if echo "$F2A" | grep -qE "getaddrinfo|ENOTFOUND|MongoNetwork|MongoServerSelection"; then
  bad "guard abort happened AFTER a connection attempt (preflight violated)"
else
  ok "abort fired BEFORE any network I/O (no DNS/connect attempted)"
fi
# The exact bypass that defeated the old substring guard.
F2B=$(env -u DEMO_PW_STUDENT -u DEMO_PW_FACULTY -u DEMO_PW_ADMIN \
  MONGODB_URI="mongodb://user:my-localhost-pw@rehearsal-remote.invalid:27017/?serverSelectionTimeoutMS=2000&connectTimeoutMS=2000" \
  MONGODB_DB="aics_portal_rehearsal" \
  timeout 30 node --experimental-strip-types scripts/seed-mongodb.ts 2>&1)
if echo "$F2B" | grep -q "ABORT: seeding a REMOTE database"; then
  ok "DECEPTIVE URI (credentials contain 'localhost') classified REMOTE — old bypass closed"
else
  bad "deceptive URI slipped past the guard (F2 regression)"
fi
if echo "$F2B" | grep -qE "getaddrinfo|ENOTFOUND|MongoNetwork|MongoServerSelection"; then
  bad "deceptive-URI abort happened AFTER a connection attempt"
else
  ok "deceptive-URI abort fired before any network I/O"
fi
F2C=$(MONGODB_URI="${F2URI}" MONGODB_DB="aics_portal_rehearsal" \
  DEMO_PW_STUDENT="x12345678" DEMO_PW_FACULTY="y12345678" DEMO_PW_ADMIN="z12345678" \
  timeout 60 node --experimental-strip-types scripts/seed-mongodb.ts 2>&1)
if echo "$F2C" | grep -q "ABORT: seeding a REMOTE database"; then
  bad "guard refused a remote seed even WITH env-injected values (too strict)"
else
  ok "remote URI WITH DEMO_PW_* passes the guard"
fi
if echo "$F2C" | grep -qE "getaddrinfo|ENOTFOUND|MongoNetwork|MongoServerSelection"; then
  ok "guard-passed run actually attempted the connect (failed at DNS, as expected)"
else
  bad "guard-passed run produced no connect attempt — test is vacuous"
fi

# The write-canary: state after a clean seed is 83/83/0.
state() { ${STATE} 2>/dev/null; }
assert_state() { # <expected-total> <expected-matched> <expected-tvnonzero> <label>
  local got
  got=$(state)
  if [ "$got" = "{\"total\":$1,\"matched\":$2,\"tvNonzero\":$3}" ]; then
    ok "state unchanged after $4 (${got})"
  else
    bad "state changed after $4 — got ${got}, expected total=$1 matched=$2 tvNonzero=$3"
  fi
}

echo "== 3. dry plan (read-only) =="
PLAN=$(${ROTATE} 2>&1)
echo "$PLAN" | grep -q "target db: aics_portal_rehearsal" && ok "plan prints target db (host redacted)" || bad "plan target-db line missing"
echo "$PLAN" | grep -q "MATCHED TOTAL: 83" && ok "plan matched 83 value carriers" || bad "plan matched count != 83: $(echo "$PLAN" | grep 'MATCHED TOTAL')"
echo "$PLAN" | grep -q "role/value mismatch: account with role 'teacherr'" && ok "plan flags the seeded rogue.role anomaly" || bad "rogue.role anomaly not reported"
assert_state 83 83 0 "the dry plan"

echo "== 4. encrypted backup =="
KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
BACKUP_KEY="${KEY}" ${ROTATE} --backup-to "${BACKUP}" 2>&1 | grep -q "BACKUP OK" \
  && ok "backup written + decrypt-verified at creation" || bad "backup step failed"
grep -q "scrypt" "${BACKUP}" && bad "backup contains plaintext scrypt hashes" || ok "backup is ciphertext (no scrypt strings)"
grep -qE "juan|reyes|bautista|admin|student123|faculty123|admin123" "${BACKUP}" \
  && bad "backup leaks usernames or password values" || ok "backup leaks no usernames/values"
assert_state 83 83 0 "the backup step"

echo "== 5. NEGATIVE preflight tests (all must abort with zero writes) =="
# N1: apply without the sanction flag.
N1=$(env -u DEMO_ROTATE_SANCTIONED BACKUP_KEY="${KEY}" \
  ${ROTATE} --apply --expect 83 --backup "${BACKUP}" 2>&1)
echo "$N1" | grep -q "DEMO_ROTATE_SANCTIONED=1 is required" && ok "N1 apply without sanction aborts" || bad "N1 did not abort"
assert_state 83 83 0 "N1"

# N2: rollback without the sanction flag (F3).
N2=$(env -u DEMO_ROTATE_SANCTIONED BACKUP_KEY="${KEY}" \
  ${ROTATE} --rollback --backup "${BACKUP}" 2>&1)
echo "$N2" | grep -q "DEMO_ROTATE_SANCTIONED=1 is required" && ok "N2 rollback without sanction aborts (F3)" || bad "N2 did not abort"
assert_state 83 83 0 "N2"

# N3: rollback with invalid sanction values (F3 — only literal '1' counts).
for VAL in "0" "true" ""; do
  N3=$(DEMO_ROTATE_SANCTIONED="${VAL}" BACKUP_KEY="${KEY}" \
    ${ROTATE} --rollback --backup "${BACKUP}" 2>&1)
  if echo "$N3" | grep -q "DEMO_ROTATE_SANCTIONED=1 is required"; then
    ok "N3 rollback with sanction='${VAL}' aborts"
  else
    bad "N3 rollback with sanction='${VAL}' did not abort"
  fi
done
assert_state 83 83 0 "N3"

# N4: apply with a wrong BACKUP_KEY (F1 pre-flight decrypt).
N4=$(env "${NEWVALUES[@]}" DEMO_ROTATE_SANCTIONED=1 \
  BACKUP_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  ${ROTATE} --apply --expect 83 --allow-mismatch --backup "${BACKUP}" 2>&1)
echo "$N4" | grep -q "failed to decrypt" && ok "N4 apply with wrong BACKUP_KEY aborts at pre-flight" || bad "N4 did not abort cleanly"
assert_state 83 83 0 "N4"

# N5: apply with a byte-corrupted backup (F1 GCM integrity).
node -e "
const fs = require('fs');
const b = Buffer.from(fs.readFileSync('${BACKUP}', 'utf8'), 'utf8');
b[300] = b[300] === 65 ? 66 : 65; // flip one byte inside the data hex
fs.writeFileSync('${BACKUP_CORRUPT}', b.toString('utf8'));
"
N5=$(env "${NEWVALUES[@]}" DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" \
  ${ROTATE} --apply --expect 83 --allow-mismatch --backup "${BACKUP_CORRUPT}" 2>&1)
echo "$N5" | grep -q "failed to decrypt" && ok "N5 corrupted backup aborts at pre-flight (GCM)" || bad "N5 did not abort cleanly"
assert_state 83 83 0 "N5"

# N6/N7: synthetic backups derived from the real one (same key, same
# format): count-mismatch and id-coverage failures.
for MODE_TGT in "short:${BACKUP_SHORT}" "swapid:${BACKUP_SWAPPED}"; do
  MODE="${MODE_TGT%%:*}"; TGT="${MODE_TGT#*:}"
  MODE="${MODE}" SRC="${BACKUP}" DST="${TGT}" BACKUP_KEY="${KEY}" node -e "
const { createCipheriv, createDecipheriv, randomBytes } = require('crypto');
const fs = require('fs');
const key = Buffer.from(process.env.BACKUP_KEY, 'hex');
const { iv, tag, data } = JSON.parse(fs.readFileSync(process.env.SRC, 'utf8'));
const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
d.setAuthTag(Buffer.from(tag, 'hex'));
const pre = JSON.parse(Buffer.concat([d.update(Buffer.from(data, 'hex')), d.final()]).toString('utf8'));
let out;
if (process.env.MODE === 'short') { out = pre.slice(0, pre.length - 1); }
else { out = pre.slice(); out[out.length - 1] = { ...out[out.length - 1], _id: randomBytes(12).toString('hex') }; }
const iv2 = randomBytes(12);
const c = createCipheriv('aes-256-gcm', key, iv2);
const enc = Buffer.concat([c.update(JSON.stringify(out), 'utf8'), c.final()]);
fs.writeFileSync(process.env.DST, JSON.stringify({ iv: iv2.toString('hex'), tag: c.getAuthTag().toString('hex'), data: enc.toString('hex') }));
console.log('made ' + process.env.DST + ' (' + out.length + ' entries)');
" || die "failed to build synthetic backup ${TGT}"
done
N6=$(env "${NEWVALUES[@]}" DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" \
  ${ROTATE} --apply --expect 83 --allow-mismatch --backup "${BACKUP_SHORT}" 2>&1)
echo "$N6" | grep -q "backup holds 82 docs but the live plan matched 83" \
  && ok "N6 count-mismatched backup aborts before writes (F1)" || bad "N6 did not abort: $(echo "$N6" | grep -E 'ABORT|UPDATED' | head -1)"
assert_state 83 83 0 "N6"
N7=$(env "${NEWVALUES[@]}" DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" \
  ${ROTATE} --apply --expect 83 --allow-mismatch --backup "${BACKUP_SWAPPED}" 2>&1)
echo "$N7" | grep -q "absent from the backup" \
  && ok "N7 id-uncovered backup aborts before writes (F1)" || bad "N7 did not abort: $(echo "$N7" | grep -E 'ABORT|UPDATED' | head -1)"
assert_state 83 83 0 "N7"

# N8: wrong --expect (pre-existing guard, kept covered).
N8=$(env "${NEWVALUES[@]}" DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" \
  ${ROTATE} --apply --expect 999 --allow-mismatch --backup "${BACKUP}" 2>&1)
echo "$N8" | grep -q "!== --expect 999" && ok "N8 wrong --expect aborts" || bad "N8 did not abort"
assert_state 83 83 0 "N8"

echo "== 6. POSITIVE: sanctioned apply (expect 83, --allow-mismatch for rogue.role) =="
APPLY_LOG=$(env "${NEWVALUES[@]}" DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" \
  ${ROTATE} --apply --expect 83 --allow-mismatch --backup "${BACKUP}" 2>&1)
echo "$APPLY_LOG" | grep -q "UPDATED: 83/83  VERIFIED: 83/83" \
  && ok "apply updated + self-verified 83/83" || bad "apply did not report 83/83: $(echo "$APPLY_LOG" | grep -E 'UPDATED|ABORT' | head -1)"

echo "== 7. post-apply state =="
assert_state 83 0 83 "the apply (all sessions dead via tokenVersion)"
PLAN2=$(${ROTATE} 2>&1)
echo "$PLAN2" | grep -q "MATCHED TOTAL: 0" && ok "post-rotation dry plan matched 0 (double-rotation impossible)" || bad "post-rotation plan matched != 0"

echo "== 8. sanctioned rollback (F3-gated) =="
RB=$(DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" ${ROTATE} --rollback --backup "${BACKUP}" 2>&1)
echo "$RB" | grep -q "ROLLBACK DONE: 83/83 docs matched" && ok "rollback processed 83/83" || bad "rollback count wrong: $(echo "$RB" | grep 'ROLLBACK DONE')"

echo "== 9. post-rollback state =="
assert_state 83 83 0 "the rollback (pre-state fully restored)"

echo "== 10. PARTIAL-FAILURE drill (simulated mid-run crash + recovery) =="
BACKUP_KEY="${KEY}" ${ROTATE} --backup-to "${BACKUP2}" 2>&1 | grep -q "BACKUP OK" \
  && ok "fresh backup for the drill" || bad "drill backup failed"
env "${NEWVALUES[@]}" DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" ${ROTATE} --apply --expect 83 --allow-mismatch --backup "${BACKUP2}" 2>&1 \
  | grep -q "UPDATED: 83/83" && ok "drill apply rotated 83/83" || bad "drill apply failed"
env "${NEWVALUES[@]}" node --experimental-strip-types scripts/lib/rehearsal-partial.ts 41 2>/dev/null | grep -q '"reverted":41' \
  && ok "constructed half-rotated state (41 docs back on old defaults)" || bad "partial construction failed"
assert_state 83 41 42 "the partial-state construction (41 old / 42 new)"
RB2=$(DEMO_ROTATE_SANCTIONED=1 BACKUP_KEY="${KEY}" ${ROTATE} --rollback --backup "${BACKUP2}" 2>&1)
echo "$RB2" | grep -q "ROLLBACK DONE: 83/83 docs matched" && ok "rollback recovered the half-rotated state" || bad "drill rollback count wrong"
assert_state 83 83 0 "the drill rollback (full recovery)"

echo ""
echo "====================================================="
echo "ROTATION REHEARSAL COMPLETE: passed=${PASS} failed=${FAIL}"
echo "====================================================="
[ "${FAIL}" -eq 0 ] || exit 1
exit 0
