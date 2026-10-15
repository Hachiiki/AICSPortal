#!/usr/bin/env bash
# ============================================================
#  verify-error-boundary.sh — proves the in-shell ErrorBoundary:
#  a render crash in one view shows the retry card while the
#  sidebar/topbar stay alive; retry and navigation recover it.
#
#  Method: temporarily injects a render-time throw into
#  AdminDashboardPage (trigger: ?crash=1 in the URL; restored in
#  the trap), production build + next start, browser login, crash
#  the dashboard on demand, screenshot, recover. Never committed.
#
#  Dev-server note: `next dev` does not hydrate the login page in
#  this sandbox (verified identical on the pre-hardening commit —
#  pre-existing quirk), so the production path is used here, same
#  as every other verify-* harness.
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="http://127.0.0.1:3111"
MONGO_BIN="db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"
TARGET="src/components/admin/AdminDashboardPage.tsx"
BACKUP="db/crash-test-backup.tsx"
EVID="docs/done/qa_evidence/ui-ux"
export MONGODB_URI=mongodb://127.0.0.1:27017
export MONGODB_DB=aics_portal
export AUTH_SECRET=local-dev-secret-aics-portal-admin-work-2026
export CLOUDINARY_CLOUD_NAME=verify-fake-cloud
export CLOUDINARY_API_KEY=123456789012345
export CLOUDINARY_API_SECRET=local-verification-fake-secret

MONGO_PID=""; DEV_PID=""; PATCHED=0
PASS=0; FAIL=0
ok()  { echo "  PASS  $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

restore() {
  if [ "$PATCHED" -eq 1 ] && [ -f "$BACKUP" ]; then mv "$BACKUP" "$TARGET"; fi
}
cleanup() {
  restore
  agent-browser close >/dev/null 2>&1 || true
  [ -n "$DEV_PID" ]  && kill "$DEV_PID" 2>/dev/null || true
  [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
  true
}
trap cleanup EXIT

echo "== 1. boot mongod + seed state =="
"$MONGO_BIN" --dbpath db/data --port 27017 --bind_ip 127.0.0.1 --quiet > db/mongod.log 2>&1 &
MONGO_PID=$!
for _ in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && break
  sleep 1
done
kill -0 "$MONGO_PID" 2>/dev/null && ok "mongod up" || { bad "mongod did not start"; exit 1; }
SEEDED=$(node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();const n=await c.db('aics_portal').collection('students').countDocuments({});console.log(n);await c.close()})()")
if [ "$SEEDED" -lt 70 ]; then
  node scripts/seed-mongodb.ts > db/seed.log 2>&1 && ok "re-seeded" || bad "seed failed"
else
  ok "existing seed intact ($SEEDED accounts — hashed passwords preserved)"
fi

echo "== 2. inject on-demand render crash =="
cp "$TARGET" "$BACKUP"
PATCHED=1
python3 - <<'EOF'
p = 'src/components/admin/AdminDashboardPage.tsx'
s = open(p).read()
# Inject a CHILD COMPONENT inside the shell content. JSX expressions
# evaluate eagerly in the parent's render pass (above the boundary);
# only a child component's own render is inside the ErrorBoundary's
# subtree, which is what we are proving here.
probe = (
  "function CrashProbe() {\n"
  "  if (typeof window !== 'undefined' && sessionStorage.getItem('crash-test') === '1') {\n"
  "    throw new Error('boundary-test: simulated render crash')\n"
  "  }\n"
  "  return null\n"
  "}\n\n"
)
anchor = 'export function AdminDashboardPage('
assert anchor in s, 'component not found'
s = s.replace(anchor, probe + anchor, 1)
needle = '<main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">\n'
inject = needle + '        <CrashProbe />\n'
assert needle in s, 'main content tag not found'
open(p, 'w').write(s.replace(needle, inject, 1))
EOF
ok "patch applied: <CrashProbe /> child inside shell content (sessionStorage flag)"

echo "== 3. production build with the patch =="
if node_modules/.bin/next build > db/build.log 2>&1; then ok "build passed"; else bad "build failed"; tail -20 db/build.log; exit 1; fi

echo "== 4. boot production server =="
node_modules/.bin/next start -p 3111 > db/dev.log 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/" && break; sleep 1; done
curl -sf -o /dev/null "$BASE/" && ok "server up ($BASE)" || { bad "server did not start"; tail -20 db/dev.log; exit 1; }

echo "== 5. browser: login, then crash the dashboard on demand =="
agent-browser close >/dev/null 2>&1 || true
agent-browser open "$BASE/" >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1 || true
sleep 2
agent-browser find label "Username" fill "admin" >/dev/null 2>&1
agent-browser find label "Password" fill "admin123" >/dev/null 2>&1
agent-browser find text "Sign In" click >/dev/null 2>&1
sleep 4
URL_NOW="$(agent-browser get url 2>/dev/null | tr -d '"')"
case "$URL_NOW" in *"/portal/commonwealth/admin/admin"*) ok "admin login -> $URL_NOW";; *) bad "login stuck at $URL_NOW";; esac
for _ in $(seq 1 30); do agent-browser wait --text "Admin Dashboard" --timeout 1000 >/dev/null 2>&1 && break; sleep 1; done

mkdir -p "$EVID"

echo "== 6. in-shell boundary: client-side crash (sessionStorage flag + sidebar nav) =="
agent-browser eval "sessionStorage.setItem('crash-test','1')" >/dev/null 2>&1
# client-side navigation away then back to Dashboard -> AdminDashboardPage mounts and throws
agent-browser open "$BASE/portal/commonwealth/admin/professors" >/dev/null 2>&1
sleep 2
agent-browser find text "Dashboard" click >/dev/null 2>&1 || agent-browser click "text=Dashboard" >/dev/null 2>&1 || true
sleep 3
agent-browser screenshot "$EVID/admin-error-boundary.png" >/dev/null 2>&1
SNAP="$(agent-browser snapshot 2>/dev/null || true)"
echo "$SNAP" | grep -q "This section hit an unexpected error" && ok "in-shell fallback card rendered (crash contained to the view)" || bad "in-shell fallback card not found"
echo "$SNAP" | grep -qi "Try again" && ok "retry action present" || bad "retry action missing"
echo "$SNAP" | grep -qi "release" && ok "sidebar/topbar still alive (shell survived the crash)" || bad "shell did not survive"
agent-browser eval "sessionStorage.removeItem('crash-test')" >/dev/null 2>&1

echo "== 7. recovery via Try again (in-shell reset) =="
SNAP_PRE="$(agent-browser snapshot 2>/dev/null || true)"
if echo "$SNAP_PRE" | grep -q "This section hit an unexpected error"; then
  # click the retry button by a11y ref (find-by-text misses it off-viewport)
  TRY_REF="$(echo "$SNAP_PRE" | grep 'button "Try again"' | grep -oE 'e[0-9]+' | head -1)"
  if [ -n "$TRY_REF" ]; then
    agent-browser click "@$TRY_REF" >/dev/null 2>&1 || true
    ok "Try again clicked (@$TRY_REF)"
  else
    bad "crash card present but retry button not found"
  fi
  sleep 3
  SNAP2="$(agent-browser snapshot 2>/dev/null || true)"
  echo "$SNAP2" | grep -q "This section hit an unexpected error" && bad "still crashed after Try again" || ok "view recovered after Try again (dashboard renders)"
else
  # The boundary reset itself once the flag was cleared (resetKey change
  # on navigation settle). Equally valid recovery.
  ok "view already recovered (boundary self-reset after flag removal)"
fi
agent-browser screenshot "$EVID/admin-error-boundary-recovered.png" >/dev/null 2>&1

echo "== 8. segment boundary: full-page-load crash (hydration) still degrades branded =="
agent-browser eval "sessionStorage.setItem('crash-test','1')" >/dev/null 2>&1
agent-browser open "$BASE/portal/commonwealth/admin/admin" >/dev/null 2>&1
sleep 4
SNAP3="$(agent-browser snapshot 2>/dev/null || true)"
echo "$SNAP3" | grep -Eq "The portal hit an unexpected error|This section hit an unexpected error" && ok "full-load crash -> branded fallback (boundary catches it, never a raw Next.js crash)" || bad "full-load crash produced no branded fallback"
echo "$SNAP3" | grep -qi "Try again" && ok "segment fallback offers retry" || bad "segment fallback missing retry"
agent-browser screenshot "$EVID/admin-error-boundary-fullload.png" >/dev/null 2>&1
agent-browser eval "sessionStorage.removeItem('crash-test')" >/dev/null 2>&1

echo "== 7. restore pristine source + rebuild =="
restore; PATCHED=0
if node_modules/.bin/next build > db/build.log 2>&1; then ok "clean rebuild after restore"; else bad "rebuild failed"; fi

echo ""
echo "== RESULT: $PASS passed, $FAIL failed =="
echo "evidence: $EVID/admin-error-boundary.png + admin-error-boundary-recovered.png"
[ "$FAIL" -eq 0 ]
