#!/usr/bin/env bash
# One-shot debug: boot mongod + server, open the admin dashboard at
# 375px, and list every element whose scrollWidth exceeds the
# viewport so the overflow culprit is named, not guessed.
set -uo pipefail
cd "$(dirname "$0")/.."

BASE="http://127.0.0.1:3111"
MONGO_BIN="db/mongodb-linux-x86_64-debian12-8.0.12/bin/mongod"
export MONGODB_URI=mongodb://127.0.0.1:27017
export MONGODB_DB=aics_portal
export AUTH_SECRET=local-dev-secret-aics-portal-admin-work-2026
MONGO_PID=""; DEV_PID=""

trap '
  agent-browser close >/dev/null 2>&1 || true
  [ -n "$DEV_PID" ]  && kill "$DEV_PID" 2>/dev/null || true
  [ -n "$MONGO_PID" ] && kill "$MONGO_PID" 2>/dev/null || true
  true
' EXIT

"$MONGO_BIN" --dbpath db/data --port 27017 --bind_ip 127.0.0.1 --quiet > db/mongod.log 2>&1 &
MONGO_PID=$!
for _ in $(seq 1 30); do
  node -e "const{MongoClient}=require('mongodb');new MongoClient('mongodb://127.0.0.1:27017').connect().then(c=>c.close()).then(()=>process.exit(0)).catch(()=>process.exit(1))" && break
  sleep 1
done

# Seed only if empty (keeps whatever the last run left).
HAS=$(node -e "const{MongoClient}=require('mongodb');(async()=>{const c=new MongoClient('mongodb://127.0.0.1:27017');await c.connect();const n=await c.db('aics_portal').collection('students').countDocuments();await c.close();console.log(n)})()")
if [ "$HAS" = "0" ]; then
  MONGODB_URI=mongodb://127.0.0.1:27017 MONGODB_DB=aics_portal node scripts/seed-mongodb.ts > db/seed.log 2>&1
fi

node_modules/.bin/next start -p 3111 > db/dev.log 2>&1 &
DEV_PID=$!
for _ in $(seq 1 60); do curl -sf -o /dev/null "$BASE/" && break; sleep 1; done

agent-browser open "$BASE/" > /dev/null
agent-browser wait --load networkidle > /dev/null 2>&1 || true
sleep 2
agent-browser find label "Username" fill "admin" > /dev/null
agent-browser find label "Password" fill "admin123" > /dev/null
agent-browser find text "Sign In" click > /dev/null
sleep 4
for _ in $(seq 1 30); do agent-browser wait --text "Admin Dashboard" --timeout 1000 > /dev/null 2>&1 && break; sleep 1; done
sleep 2

agent-browser set viewport 375 812 > /dev/null
sleep 1

echo "=== page-level overflow (scrollWidth - clientWidth) ==="
agent-browser eval "(function(){const d=document.documentElement;return d.scrollWidth-d.clientWidth})()" 2>/dev/null | tr -d '"'
echo ""
echo "=== offenders (elements wider than the 375px viewport) ==="
agent-browser eval "(function(){const vw=375;const seen=new Set();const out=[];document.querySelectorAll('body *').forEach(el=>{const r=el.getBoundingClientRect();if(r.width>vw+0.5){const key=el.tagName+'|'+(el.id?'#'+el.id:'')+'|'+String(el.className).slice(0,90);if(!seen.has(key)){seen.add(key);out.push(el.tagName+(el.id?'#'+el.id:'')+' w='+Math.round(r.width)+' cls='+String(el.className).slice(0,90))}}});return out.slice(0,20).join('\n')||'none'})()" 2>/dev/null | tr -d '"'
echo ""
agent-browser close > /dev/null 2>&1 || true
