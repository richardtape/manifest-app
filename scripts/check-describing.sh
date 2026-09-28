#!/bin/bash
# F2'S ACCEPTANCE (the plan's Task 10, step 1): moments 3–5 driven through OUR API as the
# browser drives it, against manifest-mock with mock mode's walk-through model. It starts
# nothing: start `pnpm mock` and `pnpm dev:mock` first. It asserts BODIES, and every line says
# what it asked, what it wanted and what came back.
#
#   bash scripts/check-describing.sh
#
# What the browser does in the person's session (the intake session, the project, the token),
# it does here against the mock through our /v1 proxy, as the page does. The mock answers its
# own fixtures whatever is asked (M2, FE-27), so what OUR server sent is read from what the
# conversation recorded, never from the mock's answer (step 7).
#
# bash 3.2 and the BSD userland (macOS): no associative arrays, no GNU flags. Needs jq and node.
set -u

APP=${APP:-http://127.0.0.1:7105}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB=${DB:-$ROOT/packages/server/.data/app.sqlite}
EVIL=https://evil.staging.manifest.internal
WORDS="A page where students post a response to the week's reading. They shouldn't see anyone else's until they've posted their own. I want to be able to skim them all the night before the seminar. About 200 students."

WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-describing.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/jar"
BODY="$WORK/body"
: > "$JAR"

passed=0
failed=0
STATUS=''

# call METHOD PATH [JSON] [extra curl args...]: our cookie, our Origin on a change.
call() {
  local method=$1 path=$2 json=${3:-}
  shift 3 2>/dev/null || shift $#
  local args=(-sk -m 20 -o "$BODY" -w '%{http_code}' -c "$JAR" -b "$JAR" -X "$method")
  if [ "$method" != GET ]; then
    args+=(-H "origin: $APP" -H "idempotency-key: $(uuidgen)")
  fi
  if [ -n "$json" ]; then args+=(-H 'content-type: application/json' --data "$json"); fi
  STATUS=$(curl "${args[@]}" "$@" "$APP$path") || STATUS=000
}

body() { tr -d '\n' < "$BODY" | cut -c1-200; }

# ok N WHAT, or no N WHAT WHY.
ok() { passed=$((passed + 1)); echo "ok   $1  $2"; }
no() { failed=$((failed + 1)); echo "FAIL $1  $2: $3"; }

# check N WHAT WANT-STATUS JQ: the status AND the body, by a jq expression that must be true.
check() {
  local n=$1 what=$2 want=$3 expr=$4
  if [ "$STATUS" = "$want" ] && jq -e "$expr" "$BODY" > /dev/null 2>&1; then
    ok "$n" "$what → $STATUS, $expr"
  else
    no "$n" "$what" "wanted $want and $expr, got $STATUS: $(body)"
  fi
}

# The conversation's whole state: the first frame of its stream, as the page reads it.
frame() {
  curl -sN -m 3 -b "$JAR" "$APP/api/conversations/$1/events" 2> /dev/null |
    sed -n 's/^data: //p' | head -n 1
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

echo "F2 acceptance, mock mode, against $APP"

call GET /
if [ "$STATUS" = 000 ]; then
  echo "Nothing answers on $APP. Start it: pnpm mock, then pnpm dev:mock" >&2
  exit 2
fi
if [ ! -f "$DB" ]; then
  echo "No database at $DB: is pnpm dev:mock running from this repository?" >&2
  exit 2
fi

# 0. Signed in: the mock fakes CWL.
call GET '/auth/login?returnTo=/'
if [ "$STATUS" = 302 ] && grep -q 'manifest_session' "$JAR"; then
  ok 0 "signed in through the mock's CWL"
else
  no 0 "signing in" "wanted 302 and a session, got $STATUS"
  echo "$passed passed, $failed failed"
  exit 1
fi

# 1. A conversation, in their words; then the intake key, from the person's session.
call POST /api/conversations "$(jq -n --arg d "$WORDS" '{description: $d}')"
check 1 "POST /api/conversations" 201 '.state == "describing" and (.description | test("About 200 students"))'
ID=$(jq -r .id "$BODY")
call POST /v1/intake-sessions ''
INTAKE=$(jq -r .session.id "$BODY")
jq '{key, baseUrl, model: .session.model, expiresAt: .session.expiresAt}' "$BODY" > "$WORK/key"
call POST "/api/conversations/$ID/intake-key" "$(cat "$WORK/key")"
if [ "$STATUS" = 204 ]; then ok 1b "the intake key handed over → 204"; else no 1b "the intake key" "wanted 204, got $STATUS: $(body)"; fi

# 2. Round 1: the walk-through's three questions.
call POST "/api/conversations/$ID/intake" '{}'
if until_state "$ID" '.conversation.state == "questions"' &&
  jq -e '.intake.round == 1 and (.intake.understood.questions | length) == 3' "$BODY" > /dev/null; then
  ok 2 "round 1 asked three questions: $(jq -c '[.intake.understood.questions[].id]' "$BODY")"
else
  no 2 "round 1" "$(body)"
fi

# 3. Round 2, with an answer: it asks none, and goes on to naming.
call POST "/api/conversations/$ID/intake" '{"answers":{"q1":"No"}}'
if until_state "$ID" '.conversation.state == "naming"' &&
  jq -e '.intake.round == 2 and (.intake.understood.questions | length) == 0' "$BODY" > /dev/null; then
  ok 3 "round 2 asked none, and it is naming: $(jq -c .intake.answers "$BODY")"
else
  no 3 "round 2" "$(body)"
fi

# 4. Three names; the blueprint, from the list the browser read.
call POST "/api/conversations/$ID/names" '{"taken":[]}'
if until_state "$ID" '(.intake.names | length) == 3'; then
  ok 4 "three names: $(jq -c '[.intake.names[].slug]' "$BODY")"
else
  no 4 "names" "$(body)"
fi
call GET /v1/blueprints
call POST "/api/conversations/$ID/blueprint" "$(jq -c '{blueprints: .}' "$BODY")"
if until_state "$ID" '.intake.blueprint.blueprint == "node-ts-mongo@1"'; then
  ok 4b "the blueprint: node-ts-mongo@1"
else
  no 4b "the blueprint" "$(body)"
fi

# 5. Make it, in the person's session: the project, its token, the handover; the intake ended.
call POST /v1/projects '{"slug":"reading-responses","name":"Reading responses","blueprint":"node-ts-mongo@1","audience":{"scale":"class","burst":"synchronised"}}'
check 5 "createProject (the mock's own project: FE-27)" 201 '.id | test("^[0-9a-f-]{36}$")'
PROJECT=$(jq -r .id "$BODY")
call POST "/v1/projects/$PROJECT/tokens" '{"name":"Building — First build","capabilities":["project:read","source:write","secret:write","build:create","release:create","release:deploy","output:read","agent:session"],"expiresInDays":7}'
check 5b "mintToken" 201 '.secret | startswith("mft_")'
TOKEN=$(jq -r .secret "$BODY")
call DELETE "/v1/intake-sessions/$INTAKE" ''
call POST "/api/conversations/$ID/project" "$(jq -n --arg p "$PROJECT" --arg t "$TOKEN" '{projectId: $p, token: $t}')"
if [ "$STATUS" = 204 ] && until_state "$ID" ".conversation.state == \"making\" and .intake.project.id == \"$PROJECT\""; then
  ok 5c "handed over → 204; making, tied to $PROJECT"
else
  no 5c "the handover" "wanted 204 and making, got $STATUS: $(body)"
fi

# 6. The plan, written; corrected, one row marked; agreed.
call POST "/api/conversations/$ID/plan" '{}'
if [ "$STATUS" = 202 ] && until_state "$ID" '.conversation.state == "plan-ready"' &&
  jq -e '.plan.version == 1 and .plan.plan.changed == [] and (.plan.plan.onlyYouKnow | length) == 2' "$BODY" > /dev/null; then
  ok 6 "the plan, version 1: $(jq -c '.plan.plan | {studentsSee, whoGetsIn}' "$BODY" | cut -c1-120)…"
else
  no 6 "the plan" "wanted 202 and plan-ready, got $STATUS: $(body)"
fi
call POST "/api/conversations/$ID/plan/correction" '{"correction":"My TA should see everything too."}'
if [ "$STATUS" = 202 ] && until_state "$ID" '.conversation.state == "plan-ready" and .plan.version == 2' &&
  jq -e '.plan.plan.changed == ["youSee"]' "$BODY" > /dev/null; then
  ok 6b "corrected: version 2, one row marked, youSee"
else
  no 6b "the correction" "wanted version 2 with youSee marked, got $STATUS: $(body)"
fi
call POST "/api/conversations/$ID/plan/agree" '{"answers":{"late":"It closes at the deadline."}}'
if [ "$STATUS" = 202 ] && until_state "$ID" '.conversation.state == "agreed"'; then
  ok 6c "agreed"
else
  no 6c "agreeing" "wanted 202 and agreed, got $STATUS: $(body)"
fi

# 7. What our server sent to createCommit, as the conversation records it: a dry run, then
#    the commit, each with docs/plan.md as its only change.
sql "select body from messages where conversation_id = '$ID' order by seq" > "$BODY"
SENT=$(jq -c '[.[].body | fromjson | select(.kind == "agreed")][0].sent | map({dryRun, paths})' "$BODY")
if [ "$SENT" = '[{"dryRun":true,"paths":["docs/plan.md"]},{"dryRun":false,"paths":["docs/plan.md"]}]' ]; then
  ok 7 "createCommit: a dry run, then the commit, docs/plan.md alone: $SENT"
else
  no 7 "what was sent to createCommit" "got $SENT"
fi

# 8. A student app's post: refused, and nothing changes.
call POST "/api/conversations/$ID/plan" '{}' -H "origin: $EVIL"
check 8 "POST from $EVIL" 403 '. == {"error":{"code":"ORIGIN_REFUSED"}}'

# 10. A refusal carries a reference, and problems holds its row. A conversation with no key
#     handed over: its intake is refused INTAKE_KEY_MISSING, on its stream.
call POST /api/conversations "$(jq -n --arg d "$WORDS" '{description: $d}')"
OTHER=$(jq -r .id "$BODY")
curl -sN -m 15 -b "$JAR" "$APP/api/conversations/$OTHER/events" > "$WORK/stream" 2> /dev/null &
STREAM=$!
sleep 1
call POST "/api/conversations/$OTHER/intake" '{}'
waited=0
until grep -q '"kind":"refusal"' "$WORK/stream" || [ "$waited" -ge 10 ]; do sleep 1; waited=$((waited + 1)); done
kill "$STREAM" 2> /dev/null
wait "$STREAM" 2> /dev/null
REFUSAL=$(sed -n 's/^data: //p' "$WORK/stream" | jq -c 'select(.kind == "refusal")' | head -n 1)
REFERENCE=$(printf '%s' "$REFUSAL" | jq -r .reference 2> /dev/null)
ROW=$(sql "select * from problems where reference = '$REFERENCE'")
if printf '%s' "$REFERENCE" | grep -Eq '^[0-9A-F]{4}-[0-9A-F]{4}$' &&
  printf '%s' "$ROW" | jq -e ".[0].code == \"INTAKE_KEY_MISSING\" and .[0].conversation_id == \"$OTHER\"" > /dev/null; then
  ok 10 "a refusal with its reference $REFERENCE, and its row: $(printf '%s' "$ROW" | jq -c '.[0] | {code, place, operation}')"
else
  no 10 "a refusal and its row" "frame $REFUSAL; row $ROW"
fi

# 9. No credential anywhere: not the mock's token, not a model key, in any table.
DUMP=$(node -e "
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(process.argv[1], { readOnly: true })
  const tables = db.prepare(\"select name from sqlite_master where type = 'table'\").all()
  console.log(tables.map(({ name }) => JSON.stringify(db.prepare('select * from \"' + name + '\"').all())).join('\n'))
" "$DB" 2> /dev/null)
if [ -n "$DUMP" ] && ! printf '%s' "$DUMP" | grep -Eq 'mft_|sk-'; then
  ok 9 "no mft_ and no sk- in any table ($(printf '%s' "$DUMP" | wc -c | tr -d ' ') bytes read)"
else
  no 9 "no credential kept" "found $(printf '%s' "$DUMP" | grep -Eo '(mft_|sk-)[A-Za-z0-9_-]{0,12}' | head -3 | tr '\n' ' ')"
fi

echo "$passed passed, $failed failed"
[ "$failed" = 0 ]
