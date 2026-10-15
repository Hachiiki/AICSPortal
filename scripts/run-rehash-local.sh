#!/usr/bin/env bash
# ============================================================
#  run-rehash-local.sh — execute the bulk password rehash against
#  the LOCAL dev database (aics_portal @ 127.0.0.1:27017).
#
#  This is the local rehearsal of the production procedure: the same
#  script, same modes, same guards, pointed at the seeded dev DB that
#  still holds the 77 legacy plaintext accounts. PRODUCTION (Atlas)
#  is NOT touched — that run stays gated on owner approval, see
#  docs/password-rehash-runbook.md.
#
#  One invocation (background processes die between sessions here):
#    1. boot local mongod
#    2. dry-run the rehash script            -> derive the live todo count
#    3. generate a fresh BACKUP_KEY (db/backups/, chmod 600)
#    4. --backup-to  (AES-256-GCM encrypted pre-image, self-verified)
#    5. --apply --expect <N> --bump-tv --backup <path>
#    6. post-conditions: zero plaintext, logins still work
#       (admin + faculty + student), wrong password rejected
#
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

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="db/backups"
BACKUP_PATH="$BACKUP_DIR/students-$STAMP.json.enc"
KEY_PATH="$BACKUP_DIR/BACKUP_KEY-$STAMP.txt"

MONGO_PID=""; DEV_PID=""
PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

trap '
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

# ------------------------------------------------------------
echo "== 2. dry-run (zero writes) =="
DRY_OUT="$(node scripts/rehash-passwords.ts 2>&1)" || { echo "$DRY_OUT"; bad "dry-run failed"; exit 1; }
echo "$DRY_OUT"
TODO_N="$(echo "$DRY_OUT" | sed -n 's/.*to-rehash=\([0-9]*\).*/\1/p' | head -1)"
TOTAL_N="$(echo "$DRY_OUT" | sed -n 's/^total=\([0-9]*\).*/\1/p' | head -1)"
if [ -z "${TODO_N:-}" ] || [ "$TODO_N" -lt 1 ] 2>/dev/null; then
  bad "no legacy plaintext accounts found (to-rehash=$TODO_N) — nothing to rehearse"
  exit 1
fi
ok "dry-run: total=$TOTAL_N to-rehash=$TODO_N (zero writes so far)"

# ------------------------------------------------------------
echo "== 3. fresh BACKUP_KEY =="
mkdir -p "$BACKUP_DIR"
BACKUP_KEY="$(openssl rand -hex 32)"
printf '%s\n' "$BACKUP_KEY" > "$KEY_PATH"
chmod 600 "$KEY_PATH"
ok "key written to $KEY_PATH (gitignored, 0600, never printed)"

# ------------------------------------------------------------
echo "== 4. encrypted backup =="
BACKUP_OUT="$(BACKUP_KEY="$BACKUP_KEY" node scripts/rehash-passwords.ts --backup-to "$BACKUP_PATH" 2>&1)" || { echo "$BACKUP_OUT"; bad "backup failed"; exit 1; }
echo "$BACKUP_OUT"
echo "$BACKUP_OUT" | grep -q "backup ok" && ok "backup decrypt-verified on disk: $BACKUP_PATH" || bad "backup verification line missing"

# ------------------------------------------------------------
echo "== 5. apply (expect $TODO_N, bump tokenVersion) =="
APPLY_OUT="$(BACKUP_KEY="$BACKUP_KEY" node scripts/rehash-passwords.ts --apply --expect "$TODO_N" --bump-tv --backup "$BACKUP_PATH" 2>&1)" || { echo "$APPLY_OUT"; bad "apply failed"; exit 1; }
echo "$APPLY_OUT"
echo "$APPLY_OUT" | grep -q "verified $TODO_N/$TODO_N" && ok "self-verify: $TODO_N/$TODO_N round-trip with the app's verifyPassword" || bad "self-verify line missing"
echo "$APPLY_OUT" | grep -q "remaining-plaintext=0" && ok "remaining plaintext after apply: 0" || bad "plaintext remains after apply"

# ------------------------------------------------------------
echo "== 6. post-conditions via mongod directly =="
POST="$(node -e "
const{MongoClient}=require('mongodb');
(async()=>{
  const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();
  const col=c.db('aics_portal').collection('students');
  const total=await col.countDocuments({});
  const plain=await col.countDocuments({password:{\$exists:true,\$type:'string'},\$nor:[{password:{\$regex:'^scrypt\\\\\$'}}]});
  console.log(JSON.stringify({total,plain}));
  await c.close();
})()")"
echo "  db state: $POST"
echo "$POST" | grep -q '"plain":0' && ok "database reports zero plaintext" || bad "database still reports plaintext"

# ------------------------------------------------------------
echo "== 7. logins still work (production server) =="
node_modules/.bin/next start -p 3111 > db/dev.log 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/" && break; sleep 1; done
if curl -sf -o /dev/null "$BASE/"; then ok "server up ($BASE)"; else bad "server did not start (db/dev.log)"; tail -20 db/dev.log; exit 1; fi

login() { # $1 username, $2 password -> prints HTTP status
  curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"$2\"}" "$BASE/api/auth/login"
}
ST_A="$(login admin admin123)";      [ "$ST_A" = "200" ] && ok "admin/admin123 -> 200" || bad "admin login -> $ST_A"
ST_F="$(login m.reyes faculty123)";  [ "$ST_F" = "200" ] && ok "m.reyes/faculty123 -> 200" || bad "faculty login -> $ST_F"
ST_S="$(login juan.santos student123)"; [ "$ST_S" = "200" ] && ok "juan.santos/student123 -> 200" || bad "student login -> $ST_S"
ST_W="$(login admin wrong-password)";   [ "$ST_W" = "401" ] && ok "admin/wrong-password -> 401" || bad "wrong password -> $ST_W (expected 401)"
ST_O="$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{\"username\":\"\$ne\",\"password\":null}' "$BASE/api/auth/login")"
[ "$ST_O" = "400" ] && ok "operator-injection login -> 400 (zod)" || bad "operator login -> $ST_O (expected 400)"

# ------------------------------------------------------------
echo ""
echo "== RESULT: $PASS passed, $FAIL failed =="
echo "backup:    $BACKUP_PATH"
echo "key:       $KEY_PATH  (needed for --rollback; keep until confident)"
[ "$FAIL" -eq 0 ]
