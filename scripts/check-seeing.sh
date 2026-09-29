#!/bin/bash
# F4'S ACCEPTANCE AGAINST THE MOCK (the plan's Task 11, step 1): moments 7–9 driven through OUR
# API as the browser drives them, against manifest-mock with mock mode's walk-through model. It
# starts nothing: start `pnpm mock` and `pnpm dev:mock` first, FROM A FRESH DEV DATABASE (in mock
# mode every conversation is on the mock's one project, and an older one may hold it: ORIENTATION
# §7). Every line says what it asked, what it wanted and what came back.
#
#   bash scripts/check-seeing.sh
#
# The mock answers its own fixtures whatever is asked (M2, FE-27) and keeps nothing, and its
# staging already serves the draft's release. So what OUR server SENT is read from the store: each
# round's trace, the `agreed` message's commits (`sent`), and the ids a round kept (`runs.detail`),
# beside what the mock answers, read live. Moment 9 deploys from the person's own session in the
# browser: its tests hold it (`put.test.tsx`), and this script asserts our server sends no deploy
# but the sandbox's.
#
#   SCAN=<file>  the database the no-credential scan reads (default: ours). A negative control
#                points it at a copy holding a leaked row.
#
# bash 3.2 and the BSD userland (macOS): no associative arrays, no GNU flags. Needs jq and node.
set -u

APP=${APP:-http://127.0.0.1:7105}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB=${DB:-$ROOT/packages/server/.data/app.sqlite}
SCAN=${SCAN:-$DB}
EVIL=https://evil.staging.manifest.internal
FIRST_WORDS='Also show a word count on each response'
SECOND_WORDS='Let students edit a response until the deadline'
THIRD_WORDS='Put the newest responses first'

WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-seeing.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/jar"
BODY="$WORK/body"
FRAMES="$WORK/frames"
: > "$JAR"
: > "$FRAMES"

passed=0
failed=0
STATUS=''

# call METHOD PATH [JSON] [extra curl args...]: our cookie, our Origin on a change.
call() {
  local method=$1 path=$2 json=${3:-}
  shift 3 2> /dev/null || shift $#
  local args=(-sk -m 20 -o "$BODY" -w '%{http_code}' -c "$JAR" -b "$JAR" -X "$method")
  if [ "$method" != GET ]; then
    args+=(-H "origin: $APP" -H "idempotency-key: $(uuidgen)")
  fi
  if [ -n "$json" ]; then args+=(-H 'content-type: application/json' --data "$json"); fi
  STATUS=$(curl "${args[@]}" "$@" "$APP$path") || STATUS=000
}

# evil PATH JSON: a student app's post, with our cookie and ITS Origin, and no other.
evil() {
  STATUS=$(curl -sk -m 20 -o "$BODY" -w '%{http_code}' -b "$JAR" -X POST \
    -H "origin: $EVIL" -H 'content-type: application/json' --data "$2" "$APP$1") || STATUS=000
}

body() { tr -d '\n' < "$BODY" | cut -c1-200; }

ok() { passed=$((passed + 1)); echo "ok   $1  $2"; }
no() { failed=$((failed + 1)); echo "FAIL $1  $2: $3"; }

# The conversation's whole state: the first frame of its stream, as the page reads it. Every
# frame read is kept, so the no-credential check reads what reached the page too.
frame() {
  curl -sN -m 3 -b "$JAR" "$APP/api/conversations/$1/events" 2> /dev/null |
    sed -n 's/^data: //p' | head -n 1 | tee -a "$FRAMES"
}

# until_state ID JQ [SECONDS]: wait for the state frame to satisfy JQ; leave it in $BODY.
until_state() {
  local id=$1 expr=$2 limit=${3:-30} waited=0
  while [ "$waited" -lt "$limit" ]; do
    frame "$id" > "$BODY"
    if jq -e "$expr" "$BODY" > /dev/null 2>&1; then return 0; fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

# sql QUERY: rows as JSON, read behind the store's back (as db.test.ts's dump does).
sql() {
  node -e "
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(process.argv[1], { readOnly: true })
    console.log(JSON.stringify(db.prepare(process.argv[2]).all()))
  " "$DB" "$1" 2> /dev/null
}

# The latest run of a conversation, its detail parsed; and its trace, each entry with its time.
run_of() { sql "select id, round, step, status, session_ids, created_at, detail from runs where conversation_id = '$1' order by round desc, created_at desc limit 1" | jq '.[0] // {} | .detail |= (. // "null" | fromjson)'; }
trace_of() { sql "select at, entry from trace where run_id = '$1' order by seq" | jq '[.[] | (.entry | fromjson) + {at}]'; }

# mint TITLE: a token the browser mints for a change, as the ask screen does. Leaves TOKEN.
mint() {
  call POST "/v1/projects/$PROJECT/tokens" "$(jq -n --arg n "Changing — $1" \
    '{name: $n, capabilities: ["project:read","source:write","secret:write","build:create","release:create","release:deploy","output:read","agent:session"], expiresInDays: 7}')"
  TOKEN=$(jq -r '.secret // empty' "$BODY")
}

# ask WORDS TOKEN OUT: Ask for a change, in one request; its answer in OUT. Runs in the
# background for the same-second pair, so it reads the cookie jar and never writes it.
ask() {
  curl -sk -m 20 -o "$3" -w '%{http_code}' -b "$JAR" -X POST -H "origin: $APP" \
    -H 'content-type: application/json' \
    --data "$(jq -n --arg w "$1" --arg t "$2" '{words: $w, token: $t}')" \
    "$APP/api/apps/$PROJECT/conversations" > "$3.status" 2> /dev/null
}

# agree ID: Yes, change it, to the plan on screen: its version, and no answers (mock mode's
# change planner asks nothing only they know).
agree() {
  until_state "$1" '.conversation.state == "plan-ready" and .plan != null' || return 1
  local version
  version=$(jq -r .plan.version "$BODY")
  call POST "/api/conversations/$1/plan/agree" "{\"version\":$version,\"answers\":{}}"
  [ "$STATUS" = 202 ]
}

# until_building ID: wait until the conversation's latest round has called startBuild.
until_building() {
  local waited=0 run
  while [ "$waited" -lt 60 ]; do
    run=$(run_of "$1" | jq -r '.id // empty')
    if [ -n "$run" ] && trace_of "$run" | jq -e 'any(.[]; .operation == "startBuild")' > /dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
    waited=$((waited + 1))
  done
  return 1
}

echo "F4 acceptance, mock mode, against $APP"

call GET /
if [ "$STATUS" = 000 ]; then
  echo "Nothing answers on $APP. Start it: pnpm mock, then pnpm dev:mock" >&2
  exit 2
fi
if [ ! -f "$DB" ]; then
  echo "No database at $DB: is pnpm dev:mock running from this repository?" >&2
  exit 2
fi

call GET '/auth/login?returnTo=/'
if [ "$STATUS" = 302 ] && grep -q 'manifest_session' "$JAR"; then
  ok 0 "signed in through the mock's CWL"
else
  no 0 "signing in" "wanted 302 and a session, got $STATUS"
  echo "$passed passed, $failed failed"
  exit 1
fi

call GET /v1/projects
PROJECT=$(jq -r '(if type == "array" then . else .projects end)[0].id // empty' "$BODY")
if [ -z "$PROJECT" ]; then
  echo "The mock listed no project: $(body)" >&2
  exit 2
fi

# The app must be free: an older conversation holding it would keep every change here waiting.
call GET "/api/apps/$PROJECT/conversations"
HELD=$(jq -c '[.[] | select((.state | IN("making","planning","plan-ready","agreed","paused","waiting")) or (.state == "building" and .chip != "notyet")) | {title, state}]' "$BODY")
if [ "$HELD" != '[]' ]; then
  echo "The mock's app is held or waited on by an older conversation: $HELD" >&2
  echo "Start from a fresh dev database (ORIENTATION §7): stop our server, move packages/server/.data/app.sqlite aside, pnpm dev:mock." >&2
  exit 2
fi

# 1. Two changes asked in the same second on one app: one plans, and one waits at place 1
#    behind it. Each with its own token, minted first, as two ask screens would.
mint "$FIRST_WORDS"
T1=$TOKEN
mint "$SECOND_WORDS"
T2=$TOKEN
ask "$FIRST_WORDS" "$T1" "$WORK/ask1" &
ask "$SECOND_WORDS" "$T2" "$WORK/ask2" &
wait
C1=$(jq -r '.id // empty' "$WORK/ask1")
C2=$(jq -r '.id // empty' "$WORK/ask2")
ASKED="$(cat "$WORK/ask1.status") $(cat "$WORK/ask2.status")"
S1=$(frame "$C1" | jq -r .conversation.state)
S2=$(frame "$C2" | jq -r .conversation.state)
if [ "$S1" = waiting ]; then
  H=$C2
  Q=$C1
else
  H=$C1
  Q=$C2
fi
until_state "$H" '.conversation.state == "plan-ready"' 30
H_STATE=$(jq -r .conversation.state "$BODY")
Q_FRAME=$(frame "$Q")
Q_LINE=$(printf '%s' "$Q_FRAME" | jq -c '{state: .conversation.state, place: .line.place, holder: .line.holder.id}')
if [ "$ASKED" = '201 201' ] && [ "$H_STATE" = plan-ready ] &&
  printf '%s' "$Q_LINE" | jq -e --arg h "$H" '. == {state: "waiting", place: 1, holder: $h}' > /dev/null; then
  ok 1 "two asked at once → $ASKED; one planned ($H_STATE), one waits: $Q_LINE"
else
  no 1 "one plans, one waits" "asked $ASKED; states at once $S1 / $S2; the holder $H_STATE; the other $Q_LINE"
fi

# 2. Yes commits docs/plan.md, its dry run first, on the same base, and alone; the round's
#    startAgentSession comes after it. (What the file says, its Changes included, the mock keeps
#    nowhere: plan.test.ts's "Yes commits docs/plan.md — …" holds the text, and Step 2 reads it
#    back on the real platform.)
if agree "$H"; then
  AGREED=202
else
  AGREED="$STATUS"
fi
until_building "$H"
AGREED_MSG=$(sql "select at, body from messages where conversation_id = '$H' order by seq" |
  jq -c '[.[] | select((.body | fromjson).kind == "agreed") | {at, sent: (.body | fromjson).sent}][0]')
AGREED_AT=$(printf '%s' "$AGREED_MSG" | jq -r .at)
SENT=$(printf '%s' "$AGREED_MSG" | jq -c '.sent')
H_RUN=$(run_of "$H")
H_RUN_ID=$(printf '%s' "$H_RUN" | jq -r '.id // "none"')
trace_of "$H_RUN_ID" > "$WORK/trace-h"
FIRST=$(jq -c '[.[] | select(.kind == "platform")][0] | {operation, at}' "$WORK/trace-h")
if [ "$AGREED" = 202 ] && [ "$AGREED_AT" != null ] &&
  printf '%s' "$SENT" | jq -e 'length == 2 and .[0].dryRun == true and .[1].dryRun == false and .[0].baseCommit == .[1].baseCommit and .[0].paths == ["docs/plan.md"] and .[1].paths == ["docs/plan.md"]' > /dev/null &&
  printf '%s' "$FIRST" | jq -e --arg a "$AGREED_AT" '.operation == "startAgentSession" and .at >= $a' > /dev/null; then
  ok 2 "Yes → 202; docs/plan.md, a dry run then the commit on one base ($SENT), at $AGREED_AT; then the round's first call $FIRST"
else
  no 2 "the plan's commit before the round" "Yes $AGREED; agreed at $AGREED_AT sending $SENT; the round's first call $FIRST"
fi

# 3. The round runs to built, and the one waiting then starts by itself: nothing here asks it to.
if until_state "$H" '.conversation.state == "built" and .round.status == "done"' 90; then
  H_BUILT=$(jq -c '{state: .conversation.state, round: .round.status}' "$BODY")
else
  H_BUILT="not built: $(jq -c '{state: .conversation.state, round: .round.status, needs: .round.needs}' "$BODY")"
fi
if until_state "$Q" '.conversation.state == "plan-ready" and .line == null' 30; then
  Q_NOW=$(jq -c '{state: .conversation.state, line}' "$BODY")
  Q_SAID=$(sql "select body from messages where conversation_id = '$Q' and sender = 'person' order by seq" | jq -c '[.[] | (.body | fromjson).kind]')
  if [ "$Q_SAID" = '["asked"]' ] && printf '%s' "$H_BUILT" | jq -e '.state == "built"' > /dev/null 2>&1; then
    ok 3 "the first built ($H_BUILT); the second started by itself, with nothing asked of it: $Q_NOW"
  else
    no 3 "the second starting by itself" "the first $H_BUILT; the second $Q_NOW, its messages $Q_SAID"
  fi
else
  no 3 "the second starting by itself" "the first $H_BUILT; the second still $(jq -c '{state: .conversation.state, line}' "$BODY")"
fi

# 4. Stop during the second's round frees the app and sets nothing aside: a third, asked while
#    the round builds, waits at place 1, then starts by itself once the stop has landed.
if agree "$Q" && until_building "$Q"; then
  mint "$THIRD_WORDS"
  ask "$THIRD_WORDS" "$TOKEN" "$WORK/ask3"
  C3=$(jq -r '.id // empty' "$WORK/ask3")
  T_LINE=$(frame "$C3" | jq -c '{state: .conversation.state, place: .line.place, holder: .line.holder.id}')
  STOP_AT=$(node -e 'console.log(new Date().toISOString())')
  call POST "/api/conversations/$Q/stop" '{}'
  STOPPED=$STATUS
  if until_state "$C3" '.conversation.state == "plan-ready" and .line == null' 40; then
    T_NOW=$(jq -r .conversation.state "$BODY")
  else
    T_NOW="still $(jq -c '{state: .conversation.state, line}' "$BODY")"
  fi
  Q_RUN=$(run_of "$Q")
  trace_of "$(printf '%s' "$Q_RUN" | jq -r .id)" > "$WORK/trace-q"
  Q_STATUS=$(printf '%s' "$Q_RUN" | jq -r .status)
  Q_STATE=$(frame "$Q" | jq -r .conversation.state)
  MORE=$(jq -r --arg t "$STOP_AT" '[.[] | select(.at >= $t and (.operation | IN("createRelease", "deploy", "getInstanceOutput")))] | length' "$WORK/trace-q")
  if printf '%s' "$T_LINE" | jq -e --arg q "$Q" '. == {state: "waiting", place: 1, holder: $q}' > /dev/null &&
    [ "$STOPPED" = 202 ] && [ "$Q_STATUS" = stopped ] && [ "$Q_STATE" = building ] && [ "$T_NOW" = plan-ready ] && [ "$MORE" = 0 ]; then
    ok 4 "the third waited ($T_LINE); /stop during the build → 202: the second's round $Q_STATUS, it stays $Q_STATE (nothing set aside), nothing released or deployed after; the third started by itself: $T_NOW"
  else
    no 4 "Stop freeing the app" "the third $T_LINE; /stop $STOPPED; the second's round $Q_STATUS, state $Q_STATE, released or deployed after the stop $MORE; the third $T_NOW"
  fi
else
  C3=''
  no 4 "Stop freeing the app" "the second's round never reached its build: $STATUS $(body)"
fi

# 5. Our trace names no staging and no production: every deploy is answered the sandbox's own
#    instance (the mock answers it only to a deploy naming the sandbox's id; the trace's
#    "sandbox" is a constant), every getInstanceOutput reads one of the sandbox's instances, and
#    no platform entry names the staging or production environment. Every run of this run's
#    conversations: an earlier run's (a negative control's) is not this one's to judge.
call GET "/v1/projects/$PROJECT/environments"
ENVS=$(jq -c '(if type == "array" then . else .environments end) | map({kind, id})' "$BODY")
SANDBOX=$(printf '%s' "$ENVS" | jq -r '.[] | select(.kind == "sandbox") | .id')
ELSEWHERE=$(printf '%s' "$ENVS" | jq -c '[.[] | select(.kind != "sandbox") | .id]')
call GET "/v1/environments/$SANDBOX/instances"
SANDBOX_INSTANCES=$(jq -c '[.instances[].id]' "$BODY")
MINE="'$H', '$Q', '${C3:-}'"
ALL=$(sql "select r.detail, t.entry from trace t join runs r on r.id = t.run_id where r.conversation_id in ($MINE)" |
  jq -c '[.[] | (.entry | fromjson) + {instanceId: ((.detail // "null") | fromjson | .instanceId?)} | select(.kind == "platform")]')
DEPLOYS=$(printf '%s' "$ALL" | jq -c '[.[] | select(.operation == "deploy") | {named, instanceId}]')
OUTPUTS=$(printf '%s' "$ALL" | jq -c '[.[] | select(.operation == "getInstanceOutput") | .named]')
NAMED_ELSEWHERE=$(printf '%s' "$ALL" | jq -c --argjson e "$ELSEWHERE" '[.[] | select((.named // "") as $n | ($n | test("staging|production"; "i")) or ($e | index($n)) != null) | {operation, named}]')
if printf '%s' "$DEPLOYS" | jq -e --argjson s "$SANDBOX_INSTANCES" 'length >= 1 and all(.[]; .instanceId as $i | .named == "sandbox" and ($s | index($i)) != null)' > /dev/null &&
  printf '%s' "$OUTPUTS" | jq -e --argjson s "$SANDBOX_INSTANCES" 'length >= 1 and all(.[]; . as $o | ($s | index($o)) != null)' > /dev/null &&
  [ "$NAMED_ELSEWHERE" = '[]' ]; then
  ok 5 "$(printf '%s' "$DEPLOYS" | jq length) deploys, each answered a sandbox instance ($DEPLOYS); getInstanceOutput read $OUTPUTS, of $SANDBOX_INSTANCES; nothing names $ELSEWHERE"
else
  no 5 "no staging, no production" "deploys $DEPLOYS; outputs read $OUTPUTS; the sandbox's $SANDBOX_INSTANCES; named elsewhere $NAMED_ELSEWHERE"
fi

# 6. A student app's post, to each change route: refused, and nothing changes. Ask for a change
#    (F4's new route), and the routes a change now answers on: the plan's three, a message, Stop.
call GET "/api/apps/$PROJECT/conversations"
BEFORE=$(jq length "$BODY")
REFUSED=''
evil "/api/apps/$PROJECT/conversations" '{"words":"Delete every response","token":"not-a-token"}'
if [ "$STATUS" = 403 ] && jq -e '. == {"error":{"code":"ORIGIN_REFUSED"}}' "$BODY" > /dev/null 2>&1; then
  REFUSED=" apps/:projectId/conversations"
else
  no 6 "POST /api/apps/:projectId/conversations from $EVIL" "wanted 403 ORIGIN_REFUSED, got $STATUS: $(body)"
fi
TARGET=${C3:-$Q}
for route in plan plan/correction plan/agree messages stop; do
  evil "/api/conversations/$TARGET/$route" '{}'
  if [ "$STATUS" = 403 ] && jq -e '. == {"error":{"code":"ORIGIN_REFUSED"}}' "$BODY" > /dev/null 2>&1; then
    REFUSED="$REFUSED $route"
  else
    no 6 "POST /$route from $EVIL" "wanted 403 ORIGIN_REFUSED, got $STATUS: $(body)"
  fi
done
call GET "/api/apps/$PROJECT/conversations"
AFTER=$(jq length "$BODY")
TARGET_STATE=$(frame "$TARGET" | jq -r .conversation.state)
if [ "$REFUSED" = ' apps/:projectId/conversations plan plan/correction plan/agree messages stop' ] && [ "$BEFORE" = "$AFTER" ] && [ "$TARGET_STATE" = plan-ready ]; then
  ok 6 "POST from $EVIL to each of$REFUSED → 403 ORIGIN_REFUSED; still $AFTER conversations, the third still $TARGET_STATE"
elif [ "$REFUSED" = ' apps/:projectId/conversations plan plan/correction plan/agree messages stop' ]; then
  no 6 "nothing changing" "conversations $BEFORE → $AFTER; the third $TARGET_STATE"
fi

# Leave the app free for the next run: Not now sets the third aside (not counted).
if [ -n "$C3" ]; then
  call POST "/api/conversations/$C3/stop" '{}'
  echo "--   Not now on the third → $STATUS: $(frame "$C3" | jq -r .conversation.state)"
fi

# 7. No credential anywhere: not the mock's token, not a model key, in any table (runs, trace,
#    messages among them), nor in any frame the page was sent. The prompts themselves are never
#    kept (F3 Decision 10): round.test.ts and plan.test.ts read every prompt sent.
DUMP=$(node -e "
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(process.argv[1], { readOnly: true })
  const tables = db.prepare(\"select name from sqlite_master where type = 'table'\").all()
  console.log(tables.map(({ name }) => JSON.stringify(db.prepare('select * from \"' + name + '\"').all())).join('\n'))
" "$SCAN" 2> /dev/null)
KEYS='(^|[^A-Za-z0-9_])(mft_|sk-)'
LEAKED=$( (printf '%s\n' "$DUMP"; cat "$FRAMES") | grep -Eo "$KEYS[A-Za-z0-9_-]{0,12}" | head -3 | tr '\n' ' ')
if [ -n "$DUMP" ] && [ -s "$FRAMES" ] && [ -z "$LEAKED" ]; then
  ok 7 "no mft_ and no sk- in any table ($(printf '%s' "$DUMP" | wc -c | tr -d ' ') bytes) or frame ($(wc -l < "$FRAMES" | tr -d ' ') read)"
else
  no 7 "no credential kept" "found $LEAKED"
fi

echo "$passed passed, $failed failed"
[ "$failed" = 0 ]
