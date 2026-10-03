#!/bin/bash
# F5'S ACCEPTANCE AGAINST THE MOCK (the plan's Task 11, Step 1): what moments 10–15 ask of OUR
# server, driven through our API as the browser drives it, against manifest-mock with mock mode's
# walk-through model. Everything that goes live (the dry run, the deploy to students, a production
# secret) is the person's own session, in the browser: its tests hold it (dry-run-press.test.tsx,
# live.test.tsx), and this script asserts our server sends none of it. It starts nothing: start
# `pnpm mock` and `pnpm dev:mock` first, FROM A FRESH DEV DATABASE, after check-seeing.sh (in mock
# mode every conversation is on the mock's one project: ORIENTATION §7). Every line says what it
# asked, what it wanted and what came back.
#
#   bash scripts/check-going-live.sh
#
# The mock answers its own fixtures whatever is asked (FE-27) and keeps nothing, so what OUR server
# SENT is read from the store: each conversation's `asked` message, its runs' trace, and the rows
# the hand-over reads. One person only (FE-26: the mock accepts any session as Instructor One), so
# "another person's plan is 404" is api/apps.test.ts's, not this script's.
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
REHEARSAL=77777777-7777-4777-8777-777777777777
REASON='Please keep the students’ names out of what the TA sees.'
TALK="The Manifest administrator didn’t sign this version off. They said: “${REASON}”"
# What mock mode's lead answers (model/walkthrough.ts): never kept in the trace (F3 Decision 10).
SENTINELS='Students have a page listing the weeks, where they post.|Post your response, then read everyone else'

WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-going-live.XXXXXX")
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

# A conversation's asked message, parsed; and every trace entry of its runs, each with its run.
asked_of() { sql "select body from messages where conversation_id = '$1' order by seq" | jq -c '[.[] | .body | fromjson | select(.kind == "asked")][0] // {}'; }
trace_of() { sql "select t.entry from trace t join runs r on r.id = t.run_id where r.conversation_id = '$1' order by t.seq" | jq -c '[.[] | .entry | fromjson]'; }

# until_traced ID JQ [SECONDS]: wait until the conversation's trace satisfies JQ.
until_traced() {
  local id=$1 expr=$2 limit=${3:-60} waited=0
  while [ "$waited" -lt "$limit" ]; do
    if trace_of "$id" | jq -e "$expr" > /dev/null 2>&1; then return 0; fi
    sleep 1
    waited=$((waited + 1))
  done
  return 1
}

# mint TITLE: a token the browser mints for a change or a fix, as its button does. Leaves TOKEN.
mint() {
  call POST "/v1/projects/$PROJECT/tokens" "$(jq -n --arg n "Changing — $1" \
    '{name: $n, capabilities: ["project:read","source:write","secret:write","build:create","release:create","release:deploy","output:read","agent:session"], expiresInDays: 7}')"
  TOKEN=$(jq -r '.secret // empty' "$BODY")
}

# start JSON: a change or a fix on the app, as the page sends it; its id in STARTED.
start() {
  call POST "/api/apps/$PROJECT/conversations" "$1"
  STARTED=$(jq -r '.id // empty' "$BODY")
}

echo "F5 acceptance, mock mode, against $APP"

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

call GET "/v1/projects/$PROJECT/environments"
ENVS=$(jq -c '(if type == "array" then . else .environments end) | map({kind, id})' "$BODY")
SANDBOX=$(printf '%s' "$ENVS" | jq -r '.[] | select(.kind == "sandbox") | .id')
PRODUCTION=$(printf '%s' "$ENVS" | jq -r '.[] | select(.kind == "production") | .id')
# The mock lists no incident anywhere (FE-27: its fixtures, whatever is asked): the fix names one of
# ours, and what is checked is where the round reads it, never what the mock finds there.
INCIDENT=44444444-4444-4444-8444-444444444441

# 1. A fix for a start on the live address (F5 Decision 13): kept with its environment, titled for
#    it, holding the app (a second asked behind it waits at place 1), its round reading production's
#    incident. 2. The dry run's fix, asked straight after, waits behind it, keeping what the dry run
#    saw (M4's shape), and nothing more.
mint "It didn't start on the live address"
start "$(jq -n --arg i "$INCIDENT" --arg t "$TOKEN" '{fix: {incidentId: $i, environment: "production"}, token: $t}')"
C1=$STARTED
ASKED1=$STATUS
DRY_RUN=$(jq -nc --arg r "$REHEARSAL" '{rehearsalId: $r, signInStatus: null, attributesReleased: ["mail"], attributesAsked: ["ubcEduCwlPuid", "mail"]}')
mint "The dry run didn't sign anyone in"
start "$(jq -n --argjson d "$DRY_RUN" --arg t "$TOKEN" '{fix: {dryRun: $d}, token: $t}')"
C2=$STARTED
ASKED2=$STATUS
C2_LINE=$(frame "$C2" | jq -c '{state: .conversation.state, place: .line.place, holder: .line.holder.id}')
C1_TITLE=$(frame "$C1" | jq -r .conversation.title)
C1_FIX=$(asked_of "$C1" | jq -c .fix)
until_traced "$C1" 'any(.[]; .kind == "platform" and .operation == "listIncidents")' 60
C1_READ=$(trace_of "$C1" | jq -c '[.[] | select(.kind == "platform" and .operation == "listIncidents") | .named]')
if [ "$ASKED1" = 201 ] && [ "$C1_TITLE" = "It didn't start on the live address" ] &&
  printf '%s' "$C1_FIX" | jq -e --arg i "$INCIDENT" '. == {incidentId: $i, environment: "production"}' > /dev/null &&
  printf '%s' "$C2_LINE" | jq -e --arg h "$C1" '. == {state: "waiting", place: 1, holder: $h}' > /dev/null &&
  [ "$C1_READ" = '["production"]' ]; then
  ok 1 "a live address's fix → 201 \"$C1_TITLE\", kept as $C1_FIX, holding the app (the next waits: $C2_LINE), its round read the incident on $C1_READ"
else
  no 1 "a live address's fix" "asked $ASKED1, titled \"$C1_TITLE\", kept as $C1_FIX; the next $C2_LINE; incidents read on $C1_READ"
fi

# Stop the first: the dry run's fix starts by itself, and its round reads no incident (it left none).
# Check 2 proves the fix is kept with what the dry run saw and reads no incident; it does NOT prove
# those details reach the lead's view (mock mode's lead never says what it read): round.test.ts's
# "a dry run's fix reads no incident: its view says the dry run signed nobody in…" holds that
# (minors m53).
call POST "/api/conversations/$C1/stop" '{}'
STOPPED=$STATUS
C2_TITLE=$(frame "$C2" | jq -r .conversation.title)
C2_FIX=$(asked_of "$C2" | jq -c .fix)
if until_state "$C2" '.conversation.state == "built" and .round.status == "done"' 90; then
  C2_END=built
else
  C2_END="not built: $(jq -c '{state: .conversation.state, round: .round.status, needs: .round.needs}' "$BODY")"
fi
C2_READS=$(trace_of "$C2" | jq -c '[.[] | select(.kind == "platform" and .operation == "listIncidents")] | length')
C2_BUILT=$(trace_of "$C2" | jq -c '[.[] | select(.kind == "platform" and (.operation | IN("createCommit", "startBuild", "deploy"))) | .operation] | unique')
if [ "$ASKED2" = 201 ] && [ "$STOPPED" = 202 ] && [ "$C2_TITLE" = "The dry run didn't sign anyone in" ] &&
  printf '%s' "$C2_FIX" | jq -e --argjson d "$DRY_RUN" '. == {dryRun: $d}' > /dev/null &&
  [ "$C2_READS" = 0 ] && [ "$C2_END" = built ]; then
  ok 2 "the dry run's fix → 201 \"$C2_TITLE\", kept as $C2_FIX; started once the first stopped ($STOPPED), read no incident, and built ($C2_BUILT)"
else
  no 2 "the dry run's fix" "asked $ASKED2, stop $STOPPED, titled \"$C2_TITLE\", kept as $C2_FIX; incidents read $C2_READS; $C2_END"
fi

# 3. [Talk it through] (F5 Task 8): a change carrying their reason in our words and the decision it
#    answers; planned, and waiting for Yes (a change is agreed first), and found again by the
#    decision. Then Yes: agreed, it builds (and gives the hand-over a plan to read, check 5).
call GET "/v1/releases/$(jq -r '.candidateReleaseId // empty' <<< "$(curl -sk -m 20 -b "$JAR" "$APP/v1/projects/$PROJECT/launch-readiness")")/approval"
APPROVAL=$(jq -r '.id // empty' "$BODY")
mint "$TALK"
start "$(jq -n --arg w "$TALK" --arg t "$TOKEN" --arg a "$APPROVAL" '{words: $w, token: $t, refusal: {approvalId: $a}}')"
C3=$STARTED
ASKED3=$STATUS
if until_state "$C3" '.conversation.state == "plan-ready" and .plan != null and .line == null' 30; then
  C3_NOW=plan-ready
else
  C3_NOW="$(jq -c '{state: .conversation.state, line}' "$BODY")"
fi
C3_ASKED=$(asked_of "$C3")
call GET "/api/apps/$PROJECT/refusals/$APPROVAL/conversation"
FOUND=$(jq -r '.id // empty' "$BODY")
if [ "$ASKED3" = 201 ] && [ "$C3_NOW" = plan-ready ] && [ "$FOUND" = "$C3" ] &&
  printf '%s' "$C3_ASKED" | jq -e --arg a "$APPROVAL" --arg r "$REASON" '(.words | contains($r)) and .refusal == {approvalId: $a} and .fix == null' > /dev/null; then
  ok 3 "Talk it through → 201; their reason in its words, answering $APPROVAL; planned and waiting for Yes ($C3_NOW); found again by the decision"
else
  no 3 "Talk it through" "asked $ASKED3; $C3_NOW; kept $(printf '%s' "$C3_ASKED" | jq -c '{refusal, fix}'); found again $FOUND"
fi
VERSION=$(frame "$C3" | jq -r '.plan.version // empty')
call POST "/api/conversations/$C3/plan/agree" "{\"version\":${VERSION:-0},\"answers\":{}}"
AGREED=$STATUS
if until_state "$C3" '.conversation.state == "built" and .round.status == "done"' 90; then
  C3_END=built
else
  C3_END="not built: $(jq -c '{state: .conversation.state, round: .round.status}' "$BODY")"
fi
echo "--   Yes on the change → $AGREED: $C3_END"

# 4. Our trace names no deploy but the sandbox's, each answered a sandbox instance, and no launch
#    action at all: those are the person's own session's (Decision 8, 10). Production is only read
#    (a fix's incident). Every run of this run's conversations, and none other.
call GET "/v1/environments/$SANDBOX/instances"
SANDBOX_INSTANCES=$(jq -c '[.instances[].id]' "$BODY")
MINE="'$C1', '$C2', '$C3'"
ALL=$(sql "select r.detail, t.entry from trace t join runs r on r.id = t.run_id where r.conversation_id in ($MINE)" |
  jq -c '[.[] | (.entry | fromjson) + {instanceId: ((.detail // "null") | fromjson | .instanceId?)} | select(.kind == "platform")]')
DEPLOYS=$(printf '%s' "$ALL" | jq -c '[.[] | select(.operation == "deploy") | {named, instanceId}]')
LAUNCHING=$(printf '%s' "$ALL" | jq -c '[.[] | select(.operation | IN("runRehearsal", "approveRelease", "rejectRelease", "recordIamRegistration", "recordPrivacyAssessment", "setAppSecret")) | .operation]')
PROD=$(printf '%s' "$ALL" | jq -c --arg p "$PRODUCTION" '[.[] | select((.named // "") as $n | $n == "production" or $n == $p) | .operation] | unique')
if printf '%s' "$DEPLOYS" | jq -e --argjson s "$SANDBOX_INSTANCES" 'length >= 1 and all(.[]; .instanceId as $i | .named == "sandbox" and ($s | index($i)) != null)' > /dev/null &&
  [ "$LAUNCHING" = '[]' ] &&
  printf '%s' "$PROD" | jq -e 'all(.[]; IN("listIncidents", "listEnvironments", "listInstances"))' > /dev/null; then
  ok 4 "$(printf '%s' "$DEPLOYS" | jq length) deploys, each the sandbox's ($DEPLOYS); no launch action; production only read ($PROD)"
else
  no 4 "no deploy but the sandbox's, no launch action" "deploys $DEPLOYS; launch actions $LAUNCHING; production named by $PROD"
fi

# 5. The hand-over's rows (F5 Task 9): exactly What students see and Who gets in, of the plan agreed
#    by the moment given (Decision 12); none agreed by then, 404; a moment that is not one, 400;
#    nobody signed in, 401.
call GET "/api/apps/$PROJECT/plan"
ROWS=$STATUS
KEYS=$(jq -c 'keys' "$BODY")
call GET "/api/apps/$PROJECT/plan?before=2000-01-01T00:00:00.000Z"
BEFORE=$STATUS
call GET "/api/apps/$PROJECT/plan?before=yesterday"
BAD="$STATUS $(jq -r '.error.code // empty' "$BODY")"
NOBODY=$(curl -sk -m 20 -o /dev/null -w '%{http_code}' "$APP/api/apps/$PROJECT/plan") || NOBODY=000
if [ "$ROWS" = 200 ] && [ "$KEYS" = '["studentsSee","whoGetsIn"]' ] && [ "$BEFORE" = 404 ] &&
  [ "$BAD" = '400 PLAN_QUERY_INVALID' ] && [ "$NOBODY" = 401 ]; then
  ok 5 "the plan's rows → $ROWS, exactly $KEYS; agreed by 2000 → $BEFORE; a moment that is not one → $BAD; nobody signed in → $NOBODY"
else
  no 5 "the hand-over's two rows" "→ $ROWS $KEYS; by 2000 → $BEFORE; not a moment → $BAD; nobody → $NOBODY"
fi

# 6. A student app's post of each shape F5 added (a live address's fix, a dry run's fix, Talk it
#    through): refused, and nothing is kept.
call GET "/api/apps/$PROJECT/conversations"
COUNT=$(jq length "$BODY")
REFUSED=''
for shape in \
  "$(jq -nc --arg i "$INCIDENT" '{fix: {incidentId: $i, environment: "production"}, token: "not-a-token"}')" \
  "$(jq -nc --argjson d "$DRY_RUN" '{fix: {dryRun: $d}, token: "not-a-token"}')" \
  "$(jq -nc --arg a "$APPROVAL" '{words: "Talk it through", token: "not-a-token", refusal: {approvalId: $a}}')"; do
  evil "/api/apps/$PROJECT/conversations" "$shape"
  if [ "$STATUS" = 403 ] && jq -e '. == {"error":{"code":"ORIGIN_REFUSED"}}' "$BODY" > /dev/null 2>&1; then
    REFUSED="$REFUSED $(printf '%s' "$shape" | jq -r 'if .refusal then "talk" elif .fix.dryRun then "dry-run" else "live-fix" end')"
  else
    no 6 "a student app's post of $shape" "wanted 403 ORIGIN_REFUSED, got $STATUS: $(body)"
  fi
done
call GET "/api/apps/$PROJECT/conversations"
AFTER=$(jq length "$BODY")
if [ "$REFUSED" = ' live-fix dry-run talk' ] && [ "$COUNT" = "$AFTER" ]; then
  ok 6 "from $EVIL, each of$REFUSED → 403 ORIGIN_REFUSED; still $AFTER conversations"
elif [ "$REFUSED" = ' live-fix dry-run talk' ]; then
  no 6 "nothing kept" "conversations $COUNT → $AFTER"
fi

# 7. No credential anywhere: not the mock's token, not a model key, in any table or any frame the
#    page was sent; and nothing a model answered in the trace (F3 Decision 10): mock mode's lead
#    says the same sentences every round.
DUMP=$(node -e "
  const { DatabaseSync } = require('node:sqlite')
  const db = new DatabaseSync(process.argv[1], { readOnly: true })
  const tables = db.prepare(\"select name from sqlite_master where type = 'table'\").all()
  console.log(tables.map(({ name }) => JSON.stringify(db.prepare('select * from \"' + name + '\"').all())).join('\n'))
" "$SCAN" 2> /dev/null)
KEYS='(^|[^A-Za-z0-9_])(mft_|sk-)'
LEAKED=$( (printf '%s\n' "$DUMP"; cat "$FRAMES") | grep -Eo "$KEYS[A-Za-z0-9_-]{0,12}" | head -3 | tr '\n' ' ')
# This run's conversations only: a negative control's run stays in the dev database (ORIENTATION §7).
TRACED=$(sql "select t.entry from trace t join runs r on r.id = t.run_id where r.conversation_id in ($MINE)" | jq -r '.[].entry' | grep -Eo "$SENTINELS" | sort -u | tr '\n' ' ')
ENTRIES=$(sql "select count(*) as n from trace t join runs r on r.id = t.run_id where r.conversation_id in ($MINE)" | jq -r '.[0].n')
if [ -n "$DUMP" ] && [ -s "$FRAMES" ] && [ -z "$LEAKED" ] && [ "${ENTRIES:-0}" -gt 0 ] && [ -z "$TRACED" ]; then
  ok 7 "no mft_ and no sk- in any table ($(printf '%s' "$DUMP" | wc -c | tr -d ' ') bytes) or frame ($(wc -l < "$FRAMES" | tr -d ' ') read); none of the model's words in $ENTRIES trace entries"
else
  no 7 "no credential kept, no answer traced" "credentials $LEAKED; the model's words in the trace: $TRACED (of ${ENTRIES:-0} entries)"
fi

echo "$passed passed, $failed failed"
[ "$failed" = 0 ]
