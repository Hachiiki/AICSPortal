#!/usr/bin/env bash
# ============================================================
#  eval-seed-vs-backfill.sh — issue #72 supplementary evaluation
#  (user-requested 2026-10-22, post PR #84 merge)
#
#  Question under test: does updating the seed + reseeding a
#  fresh disposable DB add meaningful coverage beyond the
#  targeted backfill rehearsal? This script produces the
#  evidence: it seeds a NEWLY CREATED disposable database on a
#  throwaway mongod (port 27018, fresh dbpath) and measures the
#  dual-key state of the seeded data, then flips it to the
#  production pre-backfill shape (all stamps removed) inside
#  the disposable DB only, to measure what the fallback arm
#  and the strict gate see — i.e. exactly what production
#  looks like today and why the backfill remains necessary.
#
#  SAFETY (per user instructions):
#  - touches ONLY a newly created disposable DB (aics_seed_eval)
#    on a throwaway mongod bound to 127.0.0.1:27018 with a
#    FRESH dbpath (db/data-seed-eval, created by this script)
#  - never contacts any existing database, never production
#  - removes only its own dbpath at the end
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

MONGO_TGZ_URL="https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian12-8.0.12.tgz"
MONGO_DIR="db/mongodb-linux-x86_64-debian12-8.0.12"
MONGO_BIN="${MONGO_DIR}/bin/mongod"
DBPATH="db/data-seed-eval"          # fresh, created by this script
PORT=27018
EVAL_DB="aics_seed_eval"            # newly created disposable DB

PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }
die() { echo "  ABORT: $1 (passed=${PASS} failed=${FAIL})"; exit 2; }

[ -x "$MONGO_BIN" ] || {
  echo "== downloading mongodb (same tarball as the rehearsal runbooks) =="
  mkdir -p db
  curl -fsSL "$MONGO_TGZ_URL" -o db/mongo.tgz || die "mongodb download failed"
  tar -xzf db/mongo.tgz -C db || die "mongodb extract failed"
  rm -f db/mongo.tgz
}
[ -x "$MONGO_BIN" ] || die "mongod missing at $MONGO_BIN"

mkdir -p "$DBPATH"
echo "== booting throwaway mongod on 127.0.0.1:$PORT (fresh dbpath $DBPATH) =="
"$MONGO_BIN" --dbpath "$DBPATH" --port "$PORT" --bind_ip 127.0.0.1 \
  --fork --logpath "$(pwd)/db/seed-eval-mongod.log" >/dev/null 2>&1 \
  || die "mongod failed to start (see db/seed-eval-mongod.log)"
trap '"$MONGO_BIN" --dbpath "'"$DBPATH"'" --shutdown >/dev/null 2>&1; true' EXIT

for i in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:$PORT').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && break
  sleep 1
done

URI="mongodb://127.0.0.1:$PORT"
m() { node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('$URI');await c.connect();const r=await c.db('$EVAL_DB').$1;console.log(JSON.stringify(r));await c.close()})().catch(e=>{console.error(e.message);process.exit(1)})"; }

echo ""
echo "== 1. seed the NEWLY CREATED disposable DB ($EVAL_DB) =="
if MONGODB_URI="$URI" MONGODB_DB="$EVAL_DB" node --experimental-strip-types scripts/seed-mongodb.ts; then
  ok "seed completed cleanly on the fresh disposable DB"
else
  bad "seed failed"; die "seed run failed"
fi

echo ""
echo "== 2. post-backfill shape: what the fresh seed produces =="
STAMPED=$(m "collection('subjects').countDocuments({professorUsername:{\$exists:true}})")
TOTAL=$(m "collection('subjects').countDocuments({})")
LEGACY=$(m "collection('subjects').countDocuments({professorUsername:null})")
echo "  subjects total=$TOTAL stamped=$STAMPED legacy=$LEGACY"
[ "$TOTAL" = "96" ]    && ok "96 subject rows (14 juan + 76 roster/demo + 2 history + 4 CS103)" || bad "expected 96 subjects, got $TOTAL"
[ "$STAMPED" = "85" ]  && ok "85 stamped (81 m.reyes + 4 l.bautista)" || bad "expected 85 stamped, got $STAMPED"
[ "$LEGACY" = "11" ]   && ok "11 legacy unstamped rows (six professor names, no faculty accounts)" || bad "expected 11 legacy, got $LEGACY"

MR_STAMPED=$(m "collection('subjects').countDocuments({professorUsername:'m.reyes'})")
LB_STAMPED=$(m "collection('subjects').countDocuments({professorUsername:'l.bautista'})")
[ "$MR_STAMPED" = "81" ] && ok "m.reyes stamp count = 81" || bad "m.reyes stamps $MR_STAMPED, expected 81"
[ "$LB_STAMPED" = "4" ]  && ok "l.bautista stamp count = 4" || bad "l.bautista stamps $LB_STAMPED, expected 4"

IDX=$(m "collection('subjects').indexExists('branch_1_professorUsername_1')")
[ "$IDX" = "true" ] && ok "index {branch:1, professorUsername:1} exists (A1/4b)" || bad "professorUsername index missing"

echo ""
echo "== 3. dual-key fragment on the seeded (post-backfill) shape =="
MR_FRAG=$(m "collection('subjects').countDocuments({\$or:[{professorUsername:'m.reyes'},{professorUsername:null,professor:'Engr. Maria Cristina Reyes'}]})")
MR_STRICT=$(m "collection('subjects').countDocuments({professorUsername:'m.reyes'})")
[ "$MR_FRAG" = "81" ] && [ "$MR_STRICT" = "81" ] \
  && ok "m.reyes fragment=81 strict=81 (identical — post-backfill both arms agree)" \
  || bad "fragment=$MR_FRAG strict=$MR_STRICT, expected 81/81"

echo ""
echo "== 4. flip disposable DB to the PRODUCTION pre-backfill shape =="
echo "   (\$unset every stamp — exactly what Atlas aics_portal looks like today)"
UNSET_N=$(m "collection('subjects').updateMany({professorUsername:{\$exists:true}},{\$unset:{professorUsername:''}}).then(r=>r.modifiedCount)")
echo "   unstamped $UNSET_N rows"
[ "$UNSET_N" = "85" ] && ok "85 stamps removed in the disposable DB" || bad "unset touched $UNSET_N rows"

MR_FRAG2=$(m "collection('subjects').countDocuments({\$or:[{professorUsername:'m.reyes'},{professorUsername:null,professor:'Engr. Maria Cristina Reyes'}]})")
MR_STRICT2=$(m "collection('subjects').countDocuments({professorUsername:'m.reyes'})")
[ "$MR_FRAG2" = "81" ] && ok "pre-backfill: fallback arm still serves m.reyes 81 rows (fragment=81)" || bad "pre-backfill fragment=$MR_FRAG2, expected 81"
[ "$MR_STRICT2" = "0" ] && ok "pre-backfill: strict username-only sees 0 rows — THIS is why the backfill exists (gate A)" || bad "pre-backfill strict=$MR_STRICT2, expected 0"

LIM_FRAG=$(m "collection('subjects').countDocuments({\$or:[{professorUsername:'a.lim'},{professorUsername:null,professor:'Prof. Anna Lim'}]})")
[ "$LIM_FRAG" = "2" ] && ok "hypothetical 'Prof. Anna Lim' actor: 2 legacy rows resolve by name (fallback arm proven live)" || bad "Anna Lim fragment=$LIM_FRAG, expected 2"

echo ""
echo "== 5. cleanup: shut down throwaway mongod, remove THIS script's dbpath =="
"$MONGO_BIN" --dbpath "$DBPATH" --shutdown >/dev/null 2>&1
sleep 1
rm -rf "$DBPATH" && ok "removed disposable dbpath db/data-seed-eval (created by this script only)"

echo ""
echo "RESULT: passed=$PASS failed=$FAIL"
[ "$FAIL" = "0" ] && echo "EVALUATION EVIDENCE: ALL CHECKS GREEN" || exit 1
