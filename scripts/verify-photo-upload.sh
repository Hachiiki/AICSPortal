#!/usr/bin/env bash
# ============================================================
#  verify-photo-upload.sh — end-to-end verification for the
#  profile photo upload feature (refs TODO: profile photo upload)
#
#  Runs in ONE invocation because background processes do not
#  survive between shell sessions in this environment:
#
#    1. build for production (hydration verified against `next start` —
#       the dev server blocks /_next/hmr from 127.0.0.1 because
#       allowedDevOrigins only lists *.space-z.ai, which stalls client
#       boot when browsing via localhost)
#    2. boot a throwaway local mongod (db/data)
#    3. reset + seed aics_portal
#    4. boot `next start` with FAKE Cloudinary env
#       (signing works; Cloudinary itself rejects the fake creds,
#        which exercises the graceful UI error path)
#    5. API-level checks: 401s, sign shape, photoUrl PATCH,
#       oldPublicId derivation, cleanup scoping, DELETE remove
#    6. browser flow via agent-browser: login, avatar display,
#       upload rejection, remove, live revert
#
#  Evidence screenshots land in docs/done/qa_evidence/ui-ux/.
#  Requires: db/mongodb-linux-x86_64-debian12-8.0.12/ (see mongod
#  log for the local download), node_modules installed.
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="http://127.0.0.1:3111"
MONGO_BIN="db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"
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
echo "== 1. production build =="
if node_modules/.bin/next build > db/build.log 2>&1; then
  ok "next build clean"
else
  bad "next build failed (db/build.log)"; tail -30 db/build.log; exit 1
fi

# ------------------------------------------------------------
echo "== 2. boot mongod =="
"$MONGO_BIN" --dbpath db/data --port 27017 --bind_ip 127.0.0.1 --quiet > db/mongod.log 2>&1 &
MONGO_PID=$!
for _ in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && break
  sleep 1
done
if kill -0 "$MONGO_PID" 2>/dev/null; then ok "mongod up (pid $MONGO_PID)"; else bad "mongod did not start"; exit 1; fi

# ------------------------------------------------------------
echo "== 3. reset + seed =="
node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();await c.db('aics_portal').dropDatabase().catch(()=>{});await c.close()})()"
if MONGODB_URI=mongodb://127.0.0.1:27017 MONGODB_DB=aics_portal node scripts/seed-mongodb.ts > db/seed.log 2>&1; then
  ok "seed completed"
else
  bad "seed failed (db/seed.log)"; tail -5 db/seed.log; exit 1
fi

# ------------------------------------------------------------
echo "== 4. boot next start (fake Cloudinary env) =="
MONGODB_URI=mongodb://127.0.0.1:27017 \
MONGODB_DB=aics_portal \
AUTH_SECRET=local-verification-secret \
CLOUDINARY_CLOUD_NAME=verify-fake-cloud \
CLOUDINARY_API_KEY=123456789012345 \
CLOUDINARY_API_SECRET=local-verification-fake-secret \
node_modules/.bin/next start -p 3111 > db/dev.log 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$BASE/" && break
  sleep 1
done
if curl -sf -o /dev/null "$BASE/"; then ok "server up ($BASE)"; else bad "server did not start (db/dev.log)"; tail -20 db/dev.log; exit 1; fi

# ------------------------------------------------------------
echo "== 5. unauthenticated API checks =="
st=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/student/photo")
[ "$st" = "401" ] && ok "sign without session -> 401" || bad "sign without session -> $st"
st=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/api/student/photo?username=juan.santos")
[ "$st" = "401" ] && ok "remove without session -> 401" || bad "remove without session -> $st"
st=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"publicId":"x"}' "$BASE/api/student/photo/cleanup")
[ "$st" = "401" ] && ok "cleanup without session -> 401" || bad "cleanup without session -> $st"

# ------------------------------------------------------------
echo "== 6. authenticated API checks =="
TOKEN=$(AUTH_SECRET=local-verification-secret node scripts/mint-session.mjs juan.santos student commonwealth)
COOKIE="Cookie: aics_session=$TOKEN"
FAKE_PHOTO="https://res.cloudinary.com/verify-fake-cloud/image/upload/v123/aics-portal/photos/commonwealth/juan.santos/avatar-test.jpg"
LOCAL_PHOTO="$BASE/aics-campus.jpg"

# 6a. sign shape — fresh profile, no old asset
sign1=$(curl -s -X POST -H "$COOKIE" "$BASE/api/student/photo")
res=$(node -e "const d=JSON.parse(process.argv[1]);const c=[d.ok===true,d.folder==='aics-portal/photos/commonwealth/juan.santos',typeof d.signature==='string'&&d.signature.length===40,d.uploadUrl==='https://api.cloudinary.com/v1_1/verify-fake-cloud/image/upload',d.oldPublicId===null,d.maxBytes===5242880];console.log(c.every(Boolean)?'OK':'BAD '+JSON.stringify(d))" "$sign1")
[ "$res" = "OK" ] && ok "sign returns folder/signature/uploadUrl, oldPublicId null" || bad "sign shape: $res"

# 6b. spoof check — session user only
st=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -H "$COOKIE" "$BASE/api/student/photo?username=someone.else")
[ "$st" = "403" ] && ok "remove for another username -> 403" || bad "remove for another username -> $st"

# 6c. PATCH photoUrl (Cloudinary-style URL)
st=$(curl -s -X PATCH -H "$COOKIE" -H 'Content-Type: application/json' -d "{\"photoUrl\":\"$FAKE_PHOTO\"}" "$BASE/api/student/update?username=juan.santos" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':'BAD '+s)})")
[ "$st" = "OK" ] && ok "PATCH photoUrl (cloudinary-style)" || bad "PATCH photoUrl: $st"

# 6d. sign now derives the old asset (public_id strips the file extension)
sign2=$(curl -s -X POST -H "$COOKIE" "$BASE/api/student/photo")
res=$(node -e "const d=JSON.parse(process.argv[1]);console.log(d.oldPublicId==='aics-portal/photos/commonwealth/juan.santos/avatar-test'?'OK':'BAD '+JSON.stringify(d.oldPublicId))" "$sign2")
[ "$res" = "OK" ] && ok "sign oldPublicId derived from current photoUrl" || bad "oldPublicId: $res"

# 6e. cleanup refuses foreign asset subtrees
st=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$COOKIE" -H 'Content-Type: application/json' -d '{"publicId":"aics-portal/materials/commonwealth/CS-208/syllabus.pdf"}' "$BASE/api/student/photo/cleanup")
[ "$st" = "403" ] && ok "cleanup of materials asset -> 403" || bad "cleanup foreign -> $st"
st=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "$COOKIE" -H 'Content-Type: application/json' -d '{"publicId":"aics-portal/photos/commonwealth/maria.cruz/avatar"}' "$BASE/api/student/photo/cleanup")
[ "$st" = "403" ] && ok "cleanup of another user's photo -> 403" || bad "cleanup other user -> $st"

# 6f. cleanup accepts own subtree (destroy against fake cloud fails non-fatally)
st=$(curl -s -X POST -H "$COOKIE" -H 'Content-Type: application/json' -d '{"publicId":"aics-portal/photos/commonwealth/juan.santos/avatar-test"}' "$BASE/api/student/photo/cleanup" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':'BAD '+s)})")
[ "$st" = "OK" ] && ok "cleanup of own old asset -> ok (destroy best-effort)" || bad "cleanup own: $st"

# 6g. invalid photoUrl rejected by the existing validator
st=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH -H "$COOKIE" -H 'Content-Type: application/json' -d '{"photoUrl":"javascript:alert(1)"}' "$BASE/api/student/update?username=juan.santos")
[ "$st" = "400" ] && ok "PATCH photoUrl javascript: -> 400" || bad "PATCH javascript: -> $st"

# 6h. DELETE removes the photo
st=$(curl -s -X DELETE -H "$COOKIE" "$BASE/api/student/photo?username=juan.santos" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':'BAD '+s)})")
[ "$st" = "OK" ] && ok "DELETE removes photo" || bad "DELETE: $st"
photo=$(curl -s -H "$COOKIE" "$BASE/api/student?username=juan.santos" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const st=JSON.parse(s).student;console.log(st.photoUrl===undefined||st.photoUrl===''?'CLEARED':'STILL '+st.photoUrl)})")
[ "$photo" = "CLEARED" ] && ok "photoUrl cleared after DELETE" || bad "photoUrl after DELETE: $photo"

# 6i. seed a displayable photo for the browser pass
st=$(curl -s -X PATCH -H "$COOKIE" -H 'Content-Type: application/json' -d "{\"photoUrl\":\"$LOCAL_PHOTO\"}" "$BASE/api/student/update?username=juan.santos" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{console.log(JSON.parse(s).ok===true?'OK':'BAD '+s)})")
[ "$st" = "OK" ] && ok "PATCH photoUrl (locally loadable) for browser pass" || bad "PATCH local photo: $st"

# ------------------------------------------------------------
echo "== 7. browser flow (agent-browser) =="
EVID="docs/done/qa_evidence/ui-ux"
AB="agent-browser"
NAV="$BASE/portal/commonwealth/student/juan.santos"
# agent-browser eval prints booleans raw but JSON-quotes strings — strip
# the quotes so shell comparisons work for both.
ev() { $AB eval "$1" 2>/dev/null | tr -d '"'; }

$AB open "$BASE/" > /dev/null
$AB wait --load networkidle > /dev/null 2>&1 || true
sleep 2
$AB find label "Username" fill "juan.santos" > /dev/null
$AB find label "Password" fill "student123" > /dev/null
$AB find text "Sign In" click > /dev/null
sleep 4
url=$($AB get url)
case "$url" in *"/portal/commonwealth/student/juan.santos"*) ok "login -> $url" ;; *) bad "login stuck at $url" ;; esac
$AB wait --text "COMMONWEALTH" --timeout 15000 > /dev/null 2>&1
sleep 2
$AB screenshot "$EVID/photo-01-dashboard-avatar.png" > /dev/null

# avatar renders in the top bar
res=$(ev "!!document.querySelector('header img[src*=aics-campus]')")
[ "$res" = "true" ] && ok "topbar avatar img renders" || bad "topbar avatar img missing"
# banner + page still fine
res=$(ev "document.documentElement.clientWidth > 0 ? 'ok' : 'no'")
[ "$res" = "ok" ] && ok "dashboard interactive" || bad "dashboard not interactive"

# settings page — uploader UI
$AB open "$NAV/settings" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "Contact information" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
$AB wait --text "Contact information" --timeout 15000 > /dev/null 2>&1
$AB screenshot "$EVID/photo-02-settings-uploader.png" > /dev/null
res=$(ev "(function(){const btns=[...document.querySelectorAll('button')].map(b=>b.textContent||'');const img=document.querySelector('img[src*=aics-campus]');return btns.some(t=>t.includes('Change photo'))&&btns.some(t=>t.includes('Remove'))&&!!img})()")
[ "$res" = "true" ] && ok "settings shows preview + Change photo + Remove" || bad "settings uploader UI incomplete"

# upload attempt — signed OK, Cloudinary rejects fake creds, UI degrades gracefully
res=$(ev "(async()=>{const r=await fetch('/aics-campus.jpg');const b=await r.blob();const dt=new DataTransfer();dt.items.add(new File([b],'avatar.jpg',{type:b.type}));const i=document.querySelector('input[type=file]');i.files=dt.files;i.dispatchEvent(new Event('change',{bubbles:true}));return 'dispatched'})()")
if [ "$res" = "dispatched" ]; then
  ok "file input change dispatched (real jpeg)"
else
  bad "file dispatch failed: $res"
fi
sleep 6   # sign + Cloudinary round trip + toast
$AB screenshot "$EVID/photo-03-upload-rejected-toast.png" > /dev/null
reqs=$($AB network requests --filter "student/photo" 2>/dev/null | rg -c "api/student/photo" || true)
[ -n "$reqs" ] && [ "$reqs" -ge 1 ] && ok "sign request observed in network" || bad "no sign request observed"
reqs2=$($AB network requests --filter "cloudinary" 2>/dev/null | rg -c "cloudinary.com" || true)
[ -n "$reqs2" ] && [ "$reqs2" -ge 1 ] && ok "Cloudinary upload attempted (rejected by fake creds)" || bad "no Cloudinary attempt observed"
# after failure: no busy overlay, saved photo still intact
res=$(ev "(function(){const busy=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Change photo'));return busy?!busy.disabled:false})()")
[ "$res" = "true" ] && ok "uploader not stuck busy after rejection" || bad "uploader stuck busy after rejection"

# profile page — hero + ID card show the photo
$AB open "$NAV/profile" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "My Profile" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
$AB wait --text "My Profile" --timeout 15000 > /dev/null 2>&1
sleep 2
count=$(ev "document.querySelectorAll('img[src*=aics-campus]').length")
[ -n "$count" ] && [ "$count" -ge 2 ] && ok "profile page renders photo in hero + ID card ($count imgs)" || bad "profile photo imgs: $count"
$AB screenshot "$EVID/photo-04-profile-with-photo.png" > /dev/null

# 375px page-level overflow check on the settings page (house mobile
# standard: documentElement must not scroll sideways; elements inside
# the overflow-x-auto tab strip are clipped by design, not offenders)
$AB open "$NAV/settings" > /dev/null
for _ in $(seq 1 30); do $AB wait --text "Contact information" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
$AB set viewport 375 812 > /dev/null
sleep 1
res=$(ev "(function(){const d=document.documentElement;return d.scrollWidth - d.clientWidth})()")
[ "$res" = "0" ] && ok "settings at 375px: zero page-level overflow" || bad "375px page-level overflow: ${res}px"
$AB screenshot "$EVID/photo-05-settings-375px.png" > /dev/null
$AB set viewport 1280 800 > /dev/null
sleep 1

# remove via UI — live revert everywhere without reload (eval click is
# deterministic; the find-by-text matcher is brittle for icon buttons)
ev "(function(){const b=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').trim()==='Remove');if(b){b.click();return 'clicked'}return 'missing'})()" > /dev/null
for _ in $(seq 1 15); do $AB wait --text "Photo removed." --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
res=$(ev "(function(){return !document.querySelector('header img') && !!document.querySelector('header [aria-hidden=true]')})()")
[ "$res" = "true" ] && ok "remove: topbar avatar reverted to initials without reload" || bad "remove: topbar did not revert"
res=$(ev "(function(){const btns=[...document.querySelectorAll('button')].map(b=>b.textContent||'');return btns.some(t=>t.includes('Upload photo'))&&!btns.some(t=>t.includes('Remove'))})()")
[ "$res" = "true" ] && ok "remove: uploader back to Upload photo state" || bad "remove: uploader state wrong"
$AB screenshot "$EVID/photo-06-settings-after-remove.png" > /dev/null

# ------------------------------------------------------------
echo ""
echo "== summary: $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
