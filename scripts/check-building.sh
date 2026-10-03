#!/bin/bash
# F3'S ACCEPTANCE AGAINST THE MOCK (the plan's Task 12, step 1): moment 6 driven through OUR API
# as the browser drives it, against manifest-mock with mock mode's walk-through model. It starts
# nothing: start `pnpm mock` and `pnpm dev:mock` first. Every line says what it asked, what it
# wanted and what came back.
#
#   bash scripts/check-building.sh
#
# The mock answers its own fixtures whatever is asked (M2, FE-27): `main` never moves, its build
# is `4444…` of its own commit, and its stream plays one script per connection. So what OUR
# server SENT is read from the round's trace, whose platform entries name what each call named
# (F3 Task 8), beside the ids the round kept (`runs.detail`) and what the mock answers, read live.
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
WORDS="A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own. I want to be able to skim them all the night before the seminar. About 200 students."

WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-building.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/jar"
BODY="$WORK/body"
FRAMES="$WORK/frames"
: > "$JAR"

# THE SESSION'S NAME ON $APP's ORIGIN (FE-28, contract 1.6.0's sessionCookieFor): `__Host-` on
# https, the plain name on loopback http (the mock). jar_holds NAME [VALUE]: the jar holds a
# cookie of EXACTLY that name (curl's sixth field), and that value when one is named. Never a
# substring: `__Host-manifest_session` contains `manifest_session`.
case "$APP" in
  https://*) SESSION_NAME=__Host-manifest_session ;;
  *) SESSION_NAME=manifest_session ;;
esac
jar_holds() {
  awk -F'\t' -v n="$1" -v v="${2:-}" '$6 == n && $7 != "" && (v == "" || $7 == v) { found = 1 } END { exit !found }' "$JAR"
}
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

# bearer METHOD PATH [JSON]: the conversation's token, as our server calls the platform.
bearer() {
  local method=$1 path=$2 json=${3:-}
  local args=(-sk -m 20 -o "$BODY" -w '%{http_code}' -X "$method" -H "authorization: Bearer $TOKEN")
  if [ -n "$json" ]; then args+=(-H 'content-type: application/json' -H "idempotency-key: $(uuidgen)" --data "$json"); fi
  STATUS=$(curl "${args[@]}" "$APP$path") || STATUS=000
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
run_of() { sql "select id, round, step, status, session_ids, created_at, detail from runs where conversation_id = '$1' order by round desc, created_at desc limit 1" | jq '.[0] | .detail |= (. // "null" | fromjson)'; }
trace_of() { sql "select at, entry from trace where run_id = '$1' order by seq" | jq '[.[] | (.entry | fromjson) + {at}]'; }

# agreed: moments 3–5 as F2's acceptance drives them, to Yes, build that. Leaves ID, PROJECT, TOKEN.
agreed() {
  call POST /api/conversations "$(jq -n --arg d "$WORDS" '{description: $d}')"
  ID=$(jq -r .id "$BODY")
  call POST /v1/intake-sessions ''
  local intake
  intake=$(jq -r .session.id "$BODY")
  jq '{key, baseUrl, model: .session.model, expiresAt: .session.expiresAt}' "$BODY" > "$WORK/key"
  call POST "/api/conversations/$ID/intake-key" "$(cat "$WORK/key")"
  call POST "/api/conversations/$ID/intake" '{}'
  until_state "$ID" '.conversation.state == "questions"' || return 1
  call POST "/api/conversations/$ID/intake" '{"answers":{"q1":"No"}}'
  until_state "$ID" '.conversation.state == "naming"' || return 1
  call POST "/api/conversations/$ID/names" '{"taken":[]}'
  until_state "$ID" '(.intake.names | length) == 3' || return 1
  call GET /v1/blueprints
  call POST "/api/conversations/$ID/blueprint" "$(jq -c '{blueprints: .}' "$BODY")"
  until_state "$ID" '.intake.blueprint.blueprint == "node-ts-mongo@1"' || return 1
  call POST /v1/projects '{"slug":"reading-responses","name":"Reading responses","blueprint":"node-ts-mongo@1","audience":{"scale":"class","burst":"synchronised"}}'
  PROJECT=$(jq -r .id "$BODY")
  call POST "/v1/projects/$PROJECT/tokens" '{"name":"Building — First build","capabilities":["project:read","source:write","secret:write","build:create","release:create","release:deploy","output:read","agent:session"],"expiresInDays":7}'
  TOKEN=$(jq -r .secret "$BODY")
  call DELETE "/v1/intake-sessions/$intake" ''
  call POST "/api/conversations/$ID/project" "$(jq -n --arg p "$PROJECT" --arg t "$TOKEN" '{projectId: $p, token: $t}')"
  until_state "$ID" '.conversation.state == "making"' || return 1
  call POST "/api/conversations/$ID/plan" '{}'
  until_state "$ID" '.conversation.state == "plan-ready"' || return 1
  call POST "/api/conversations/$ID/plan/agree" '{"version":1,"answers":{"late":"It closes at the deadline."}}'
  [ "$STATUS" = 202 ]
}

echo "F3 acceptance, mock mode, against $APP"

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
if [ "$STATUS" = 302 ] && jar_holds "$SESSION_NAME"; then
  ok 0 "signed in through the mock's CWL"
else
  no 0 "signing in" "wanted 302 and a session, got $STATUS"
  echo "$passed passed, $failed failed"
  exit 1
fi

# A. One whole round, from Yes to built. Nothing here presses /build: the round is our server's.
if agreed && until_state "$ID" '.round.round == 1 and .round.status == "done" and .conversation.state == "built"' 60; then
  ok A "agreed, and round 1 ran to built: $(jq -c '{state: .conversation.state, round: .round.status, steps: [.round.steps[] | .key + " " + .state]}' "$BODY")"
else
  no A "a round to built" "wanted round 1 done and built, got $STATUS: $(body)"
fi
A=$ID
RUN=$(run_of "$A")
RUN_ID=$(printf '%s' "$RUN" | jq -r .id)
trace_of "$RUN_ID" > "$WORK/trace"
PLATFORM=$(jq -c '[.[] | select(.kind == "platform")]' "$WORK/trace")
calls() { printf '%s' "$PLATFORM" | jq -c "[.[] | select(.operation == \"$1\")]"; }

# 1. The round starts when the plan's commit lands: the plan's agreed message first, then the
#    run, whose first call is its agent session.
AGREED_AT=$(sql "select at, body from messages where conversation_id = '$A' order by seq" |
  jq -r '[.[] | select((.body | fromjson).kind == "agreed")][0].at')
FIRST=$(printf '%s' "$PLATFORM" | jq -r '.[0].operation')
RUN_AT=$(printf '%s' "$RUN" | jq -r .created_at)
if [ "$AGREED_AT" != null ] && [ "$RUN_ID" != null ] && [ ! "$RUN_AT" \< "$AGREED_AT" ] && [ "$FIRST" = startAgentSession ]; then
  ok 1 "the plan committed at $AGREED_AT; round 1's run at $RUN_AT, its first call $FIRST"
else
  no 1 "the round starting when the plan lands" "agreed $AGREED_AT, run $RUN_ID at $RUN_AT, first call $FIRST"
fi

# 2. Each commit is its dry run, then the commit, on the same base: never a commit alone.
COMMITS=$(calls createCommit)
ALONE=$(printf '%s' "$PLATFORM" | jq '
  . as $all | [range(0; length) | select($all[.].operation == "createCommit" and ($all[.].named | startswith("on ")))
   | select(. == 0 or $all[. - 1].operation != "createCommit" or $all[. - 1].named != ("dry run " + $all[.].named) or $all[. - 1].code != null)]
  | length')
LANDED=$(printf '%s' "$COMMITS" | jq '[.[] | select((.named | startswith("on ")) and .code == null)] | length')
if [ "$LANDED" -ge 1 ] && [ "$ALONE" = 0 ]; then
  ok 2 "each of $LANDED commits followed its own dry run on the same base: $(printf '%s' "$COMMITS" | jq -c '[.[].named | .[0:18]]')"
else
  no 2 "a dry run before each commit" "landed $LANDED, without their dry run $ALONE: $COMMITS"
fi

# 3. startBuild names the last commit: what the mock answers a commit (its example; main never
#    moves), asked of it live with the conversation's token.
bearer GET "/v1/projects/$PROJECT/tree"
HEAD=$(jq -r .commitSha "$BODY")
bearer POST "/v1/projects/$PROJECT/commits" "$(jq -n --arg b "$HEAD" '{baseCommit: $b, message: "check-building: what the mock answers a commit", changes: [{op: "write", path: "docs/check.md", content: "x"}]}')"
MOCK_COMMIT=$(jq -r .commitSha "$BODY")
BUILT=$(calls startBuild | jq -r 'map(.named) | join(" ")')
if [ -n "$MOCK_COMMIT" ] && [ "$MOCK_COMMIT" != null ] && [ "$BUILT" = "$MOCK_COMMIT" ]; then
  ok 3 "startBuild named the last commit, once: $BUILT"
else
  no 3 "startBuild naming the last commit" "wanted $MOCK_COMMIT once, got '$BUILT'"
fi

# 4. createRelease names that build: the one startBuild answered, as the round kept it.
BUILD_ID=$(printf '%s' "$RUN" | jq -r .detail.buildId)
RELEASED=$(calls createRelease | jq -r 'map(.named) | join(" ")')
if [ "$BUILD_ID" != null ] && [ "$RELEASED" = "$BUILD_ID" ]; then
  ok 4 "createRelease named the build startBuild answered: $RELEASED"
else
  no 4 "createRelease naming that build" "wanted $BUILD_ID, got '$RELEASED'"
fi

# 5. deploy names the sandbox: and the instance it answered is the sandbox's own, which the
#    mock answers only a deploy to the sandbox's id (FE-27; staging's is another).
bearer GET "/v1/projects/$PROJECT/environments"
SANDBOX=$(jq -r '(if type == "array" then . else .environments end)[] | select(.kind == "sandbox") | .id' "$BODY" | head -n 1)
bearer GET "/v1/environments/$SANDBOX/instances"
SANDBOX_INSTANCES=$(jq -c '[.instances[].id]' "$BODY")
INSTANCE_ID=$(printf '%s' "$RUN" | jq -r .detail.instanceId)
DEPLOYED=$(calls deploy | jq -r 'map(.named) | join(" ")')
if [ "$DEPLOYED" = sandbox ] && printf '%s' "$SANDBOX_INSTANCES" | jq -e --arg i "$INSTANCE_ID" 'index($i) != null' > /dev/null; then
  ok 5 "deploy named the sandbox, and was answered the sandbox's instance $INSTANCE_ID (of $SANDBOX_INSTANCES)"
else
  no 5 "deploy naming the sandbox" "deploy '$DEPLOYED', answered $INSTANCE_ID, the sandbox's $SANDBOX_INSTANCES"
fi

# 6. getInstanceOutput names the sandbox's instance: the one deploy answered.
READ=$(calls getInstanceOutput | jq -r 'map(.named) | join(" ")')
if [ "$READ" = "$INSTANCE_ID" ] && printf '%s' "$SANDBOX_INSTANCES" | jq -e --arg i "$READ" 'index($i) != null' > /dev/null; then
  ok 6 "getInstanceOutput named the sandbox's instance: $READ"
else
  no 6 "getInstanceOutput naming the sandbox's instance" "wanted $INSTANCE_ID, got '$READ'"
fi

# 7. The session ends: the last call ends the session the first started.
STARTED=$(calls startAgentSession | jq -r 'map(.named) | join(" ")')
LAST=$(printf '%s' "$PLATFORM" | jq -c '.[-1] | {operation, named}')
if [ -n "$STARTED" ] && printf '%s' "$LAST" | jq -e --arg s "$STARTED" '. == {operation: "endAgentSession", named: $s}' > /dev/null; then
  ok 7 "the session $STARTED ended, the round's last call"
else
  no 7 "the session ending" "started '$STARTED', last call $LAST"
fi

# 8. Stop mid-round: a second conversation, stopped while its build runs (the mock's build
#    succeeds 14 s after the stream connects, its instance 20.6 s). It ends the session, and
#    nothing is released or deployed, even after the build's signal arrives.
if agreed; then
  B=$ID
  waited=0
  BUILDING=''
  while [ "$waited" -lt 40 ]; do
    B_RUN=$(run_of "$B" | jq -r '.id // empty')
    if [ -n "$B_RUN" ] && trace_of "$B_RUN" | jq -e 'any(.[]; .operation == "startBuild")' > /dev/null 2>&1; then
      BUILDING=yes
      break
    fi
    sleep 0.5
    waited=$((waited + 1))
  done
  STOP_AT=$(node -e 'console.log(new Date().toISOString())')
  call POST "/api/conversations/$B/stop" '{}'
  STOPPED=$STATUS
  sleep 25
  B_RUN=$(run_of "$B")
  trace_of "$(printf '%s' "$B_RUN" | jq -r .id)" > "$WORK/trace-b"
  B_SESSION=$(jq -r '[.[] | select(.operation == "startAgentSession")][0].named' "$WORK/trace-b")
  AFTER=$(jq -c --arg t "$STOP_AT" '[.[] | select(.kind == "platform" and .at >= $t) | .operation]' "$WORK/trace-b")
  ENDED=$(jq -r --arg t "$STOP_AT" --arg s "$B_SESSION" '[.[] | select(.operation == "endAgentSession" and .named == $s and .at >= $t)] | length' "$WORK/trace-b")
  MORE=$(jq -r '[.[] | select(.operation | IN("createRelease", "deploy", "getInstanceOutput"))] | length' "$WORK/trace-b")
  B_STATUS=$(printf '%s' "$B_RUN" | jq -r .status)
  if [ "$BUILDING" = yes ] && [ "$STOPPED" = 202 ] && [ "$B_STATUS" = stopped ] && [ "$ENDED" -ge 1 ] && [ "$MORE" = 0 ]; then
    ok 8 "/stop during the build → 202; run stopped, session $B_SESSION ended, then nothing released or deployed in 25 s (after: $AFTER)"
  else
    no 8 "/stop mid-round" "building '$BUILDING', /stop $STOPPED, run $B_STATUS, ended $ENDED, released or deployed $MORE, after the stop $AFTER"
  fi
else
  no 8 "/stop mid-round" "a second conversation never reached agree: $STATUS $(body)"
fi

# 9. A student app's post, to each building route: refused, and nothing changes.
REFUSED=''
for route in build messages answers stop; do
  call POST "/api/conversations/$A/$route" '{}' -H "origin: $EVIL"
  if [ "$STATUS" = 403 ] && jq -e '. == {"error":{"code":"ORIGIN_REFUSED"}}' "$BODY" > /dev/null 2>&1; then
    REFUSED="$REFUSED $route"
  else
    no 9 "POST /$route from $EVIL" "wanted 403 ORIGIN_REFUSED, got $STATUS: $(body)"
  fi
done
if [ "$REFUSED" = ' build messages answers stop' ]; then
  ok 9 "POST from $EVIL to each of$REFUSED → 403 ORIGIN_REFUSED"
fi

# 10. No credential anywhere: not the mock's token, not a model key, in any table (runs, trace
#     and questions among them), nor in any frame the page was sent. The prompts themselves are
#     never kept (Decision 10), so the round's own test reads every prompt sent (round.test.ts).
DUMP=$(node -e "
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(process.argv[1], { readOnly: true })
  const tables = db.prepare(\"select name from sqlite_master where type = 'table'\").all()
  console.log(tables.map(({ name }) => JSON.stringify(db.prepare('select * from \"' + name + '\"').all())).join('\n'))
" "$SCAN" 2> /dev/null)
KEYS='(^|[^A-Za-z0-9_])(mft_|sk-)'
LEAKED=$( (printf '%s\n' "$DUMP"; cat "$FRAMES") | grep -Eo "$KEYS[A-Za-z0-9_-]{0,12}" | head -3 | tr '\n' ' ')
if [ -n "$DUMP" ] && [ -s "$FRAMES" ] && [ -z "$LEAKED" ]; then
  ok 10 "no mft_ and no sk- in any table ($(printf '%s' "$DUMP" | wc -c | tr -d ' ') bytes) or frame ($(wc -l < "$FRAMES" | tr -d ' ') read)"
else
  no 10 "no credential kept" "found $LEAKED"
fi

echo "$passed passed, $failed failed"
[ "$failed" = 0 ]
