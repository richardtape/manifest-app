#!/bin/bash
# F6'S ACCEPTANCE AGAINST THE MOCK AND MAILPIT (the plan's Task 12, Step 1), in two halves:
#
#   1. OUR API, AS THE BROWSER DRIVES IT (this script, curl against `pnpm dev:mock`, as the other
#      scripts): the Keeping watch token minted on the mock and handed over, and again; our
#      watching; another Origin's change refused on each new route; /api/needs, /api/since and an
#      app's history in their shapes; the outage's fix kept with its words; the owner's DELETE,
#      the round on it stopped first and the app's rows gone; no credential in the clear.
#   2. THE KEEPER, IN-PROCESS (`scripts/check-keeping.ts`, run by tsx): real email to Mailpit
#      from a scripted stream and a pretend live address. It needs Mailpit only.
#
#   bash scripts/check-keeping.sh             # both halves
#   HALF=1 bash scripts/check-keeping.sh      # our API only; HALF=2: the keeper only
#
# HALF ONE WRITES TO OUR DEV DATABASE, AND ITS DELETE FORGETS THE MOCK'S APP: every conversation on
# it, with its runs, trace, messages and plans, its history, members and watch token. In mock mode
# every conversation is on the mock's one project (FE-27), so run it LAST, after the other
# acceptance scripts (whose rows it removes), with `pnpm mock` and `pnpm dev:mock` running and the
# mock's app free. It starts nothing.
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
HALF=${HALF:-both}
EVIL=https://evil.staging.manifest.internal
OUTAGE_WORDS="Your students couldn't reach it"

WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-keeping.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/jar"
BODY="$WORK/body"
: > "$JAR"

passed=0
failed=0
STATUS=''

# call METHOD PATH [JSON]: our cookie, our Origin on a change.
call() {
  local method=$1 path=$2 json=${3:-}
  local args=(-sk -m 20 -o "$BODY" -w '%{http_code}' -c "$JAR" -b "$JAR" -X "$method")
  if [ "$method" != GET ]; then
    args+=(-H "origin: $APP" -H "idempotency-key: $(uuidgen)")
  fi
  if [ -n "$json" ]; then args+=(-H 'content-type: application/json' --data "$json"); fi
  STATUS=$(curl "${args[@]}" "$APP$path") || STATUS=000
}

# evil METHOD PATH [JSON]: a student app's change, with our cookie and ITS Origin.
evil() {
  local args=(-sk -m 20 -o "$BODY" -w '%{http_code}' -b "$JAR" -X "$1" -H "origin: $EVIL")
  if [ -n "${3:-}" ]; then args+=(-H 'content-type: application/json' --data "$3"); fi
  STATUS=$(curl "${args[@]}" "$APP$2") || STATUS=000
}

body() { tr -d '\n' < "$BODY" | cut -c1-200; }
ok() { passed=$((passed + 1)); echo "ok   $1  $2"; }
no() { failed=$((failed + 1)); echo "FAIL $1  $2: $3"; }

# sql QUERY: rows as JSON, read behind the store's back.
sql() {
  node -e "
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(process.argv[1], { readOnly: true })
    console.log(JSON.stringify(db.prepare(process.argv[2]).all()))
  " "$DB" "$1" 2> /dev/null
}

half_one() {
  echo "F6 acceptance, half one: our API, mock mode, against $APP"
  call GET /
  if [ "$STATUS" = 000 ]; then
    echo "Nothing answers on $APP. Start it: pnpm mock, then pnpm dev:mock" >&2
    return 2
  fi
  if [ ! -f "$DB" ]; then
    echo "No database at $DB: is pnpm dev:mock running from this repository?" >&2
    return 2
  fi
  call GET '/auth/login?returnTo=/'
  if [ "$STATUS" != 302 ] || ! grep -q 'manifest_session' "$JAR"; then
    no 0 "signing in" "wanted 302 and a session, got $STATUS"
    return 1
  fi
  ok 0 "signed in through the mock's CWL"

  call GET /v1/projects
  PROJECT=$(jq -r '(if type == "array" then . else .projects end)[0].id // empty' "$BODY")
  if [ -z "$PROJECT" ]; then
    echo "The mock listed no project: $(body)" >&2
    return 2
  fi
  # The app must be free: the outage's fix (check 6) is a round on it.
  call GET "/api/apps/$PROJECT/conversations"
  HELD=$(jq -c '[.[] | select((.state | IN("making","planning","plan-ready","agreed","paused","waiting")) or (.state == "building" and .chip != "notyet")) | {title, state}]' "$BODY")
  if [ "$HELD" != '[]' ]; then
    echo "The mock's app is held or waited on by an older conversation: $HELD" >&2
    echo "Run this after the other acceptance scripts, on a dev database whose app is free (ORIENTATION §7)." >&2
    return 2
  fi

  # 1. The Keeping watch token, minted in the person's session (project:read, output:read) and
  #    handed over: kept (201); handed again while it is good (more than 30 days left), current.
  call POST "/v1/projects/$PROJECT/tokens" \
    '{"name":"Keeping watch","capabilities":["project:read","output:read"],"expiresInDays":365}'
  MINTED=$(jq -c '{token: .secret, tokenId: .token.id, expiresAt: .token.expiresAt}' "$BODY")
  SECRET=$(jq -r '.secret // empty' "$BODY")
  call POST "/api/apps/$PROJECT/keeping" "$MINTED"
  FIRST="$STATUS $(jq -c '{watching}' "$BODY")"
  call POST "/api/apps/$PROJECT/keeping" "$MINTED"
  SECOND="$STATUS $(jq -c '{kept}' "$BODY")"
  if [ "$FIRST" = '201 {"watching":true}' ] && [ "$SECOND" = '200 {"kept":"current"}' ]; then
    ok 1 "the watch token handed over → $FIRST; again → $SECOND"
  else
    no 1 "the watch token handed over, and again" "→ $FIRST; again → $SECOND"
  fi

  # 2. We are watching it, and say who minted it.
  call GET "/api/apps/$PROJECT/keeping"
  if [ "$STATUS" = 200 ] && jq -e --arg t "$(printf '%s' "$MINTED" | jq -r .tokenId)" \
    '.watching == true and .tokenId == $t and .mine == true and (.until | type) == "string"' "$BODY" > /dev/null; then
    ok 2 "GET …/keeping → 200 $(jq -c '{watching, mine}' "$BODY")"
  else
    no 2 "GET …/keeping" "→ $STATUS $(body)"
  fi

  # 3. The token is kept sealed: its row holds no secret, and no table holds one in the clear.
  WATCH=$(sql "select sealed, token_id from watch_tokens where project_id = '$PROJECT'")
  DUMP=$(node -e "
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(process.argv[1], { readOnly: true })
    const tables = db.prepare(\"select name from sqlite_master where type = 'table'\").all()
    console.log(tables.map(({ name }) => JSON.stringify(db.prepare('select * from \"' + name + '\"').all())).join('\n'))
  " "$SCAN" 2> /dev/null)
  LEAKED=$(printf '%s\n' "$DUMP" | grep -Eo '(^|[^A-Za-z0-9_])(mft_|sk-)[A-Za-z0-9_-]{0,12}' | head -3 | tr '\n' ' ')
  if [ -n "$SECRET" ] && [ -n "$DUMP" ] && [ -z "$LEAKED" ] &&
    printf '%s' "$WATCH" | jq -e --arg s "$SECRET" 'length == 1 and (.[0].sealed | contains($s) | not) and (.[0].sealed | test("mft_") | not) and (.[0].sealed | length) > 40' > /dev/null; then
    ok 3 "watch_tokens holds one sealed value ($(printf '%s' "$WATCH" | jq -r '.[0].sealed | length') characters), and no mft_ and no sk- in any table ($(printf '%s' "$DUMP" | wc -c | tr -d ' ') bytes)"
  else
    no 3 "no credential in the clear" "leaked $LEAKED; watch_tokens $(printf '%s' "$WATCH" | jq -c '[.[] | {sealed: (.sealed | .[0:12])}]')"
  fi

  # 4. What needs them, what happened since, and the app's history: their shapes. A second visit
  #    within the hour answers the same lastHere (Decision 7).
  call GET /api/needs
  NEEDS="$STATUS $(jq -c 'keys' "$BODY")"
  NEEDS_OK=$(jq -e '(.needs | type) == "array" and all(.needs[]; (.kind | IN("question","down","answering-again","change-failed")) and (.app | has("projectId") and has("name") and has("slug")))' "$BODY" > /dev/null && echo yes)
  call GET "/api/since?projectId=$PROJECT"
  SINCE1="$STATUS $(jq -c '{keys: keys, lastHere, lines: (.lines | length)}' "$BODY")"
  SINCE_OK=$(jq -e '(.lines | type) == "array" and (.lines | length) <= 5 and all(.lines[]; .app.projectId and .at)' "$BODY" > /dev/null && echo yes)
  LAST1=$(jq -r '.lastHere' "$BODY")
  call GET "/api/since?projectId=$PROJECT"
  LAST2=$(jq -r '.lastHere' "$BODY")
  call GET "/api/apps/$PROJECT/history"
  HISTORY="$STATUS $(jq -c 'keys' "$BODY")"
  HISTORY_OK=$(jq -e '(.gaps | type) == "array" and (.lines | type) == "array" and all(.lines[]; .at and .happening.kind)' "$BODY" > /dev/null && echo yes)
  HISTORY_LINES=$(jq '.lines | length' "$BODY")
  if [ "$NEEDS" = '200 ["needs"]' ] && [ "$NEEDS_OK" = yes ] &&
    printf '%s' "$SINCE1" | grep -q '^200 {"keys":\["lastHere","lines"\]' && [ "$SINCE_OK" = yes ] && [ "$LAST1" = "$LAST2" ] &&
    [ "$HISTORY" = '200 ["from","gaps","lines"]' ] && [ "$HISTORY_OK" = yes ]; then
    ok 4 "/api/needs → $NEEDS; /api/since → $SINCE1, the same lastHere again; history → $HISTORY ($HISTORY_LINES lines)"
  else
    no 4 "the shapes" "needs $NEEDS ($NEEDS_OK); since $SINCE1 ($SINCE_OK), lastHere $LAST1 then $LAST2; history $HISTORY ($HISTORY_OK)"
  fi

  # 5. A student app's change on each new route: refused, and nothing changed.
  FROM=$(date -u -v-20M +%Y-%m-%dT%H:%M:%S.000Z)
  TO=$(date -u -v-5M +%Y-%m-%dT%H:%M:%S.000Z)
  OUTAGE=$(jq -nc --arg f "$FROM" --arg t "$TO" '{from: $f, to: $t}')
  call GET "/api/apps/$PROJECT/conversations"
  COUNT=$(jq length "$BODY")
  REFUSED=''
  evil POST "/api/apps/$PROJECT/keeping" "$MINTED"
  [ "$STATUS $(body)" = '403 {"error":{"code":"ORIGIN_REFUSED"}}' ] && REFUSED="$REFUSED keeping"
  evil POST "/api/apps/$PROJECT/conversations" "$(jq -nc --argjson o "$OUTAGE" '{fix: {outage: $o}, token: "not-a-token"}')"
  [ "$STATUS $(body)" = '403 {"error":{"code":"ORIGIN_REFUSED"}}' ] && REFUSED="$REFUSED outage-fix"
  evil DELETE "/api/apps/$PROJECT"
  [ "$STATUS $(body)" = '403 {"error":{"code":"ORIGIN_REFUSED"}}' ] && REFUSED="$REFUSED delete"
  call GET "/api/apps/$PROJECT/conversations"
  AFTER=$(jq length "$BODY")
  call GET "/api/apps/$PROJECT/keeping"
  STILL=$(jq -r .watching "$BODY")
  if [ "$REFUSED" = ' keeping outage-fix delete' ] && [ "$COUNT" = "$AFTER" ] && [ "$STILL" = true ]; then
    ok 5 "from $EVIL, each of$REFUSED → 403 ORIGIN_REFUSED; still $AFTER conversations, still watching"
  else
    no 5 "another Origin refused" "refused:$REFUSED; conversations $COUNT → $AFTER; watching $STILL"
  fi

  # 6. The outage's fix: kept with its words and its two moments; `to` before `from`, refused.
  call POST "/v1/projects/$PROJECT/tokens" \
    "$(jq -nc --arg n "Changing — $OUTAGE_WORDS" '{name: $n, capabilities: ["project:read","source:write","secret:write","build:create","release:create","release:deploy","output:read","agent:session"], expiresInDays: 7}')"
  TOKEN=$(jq -r '.secret // empty' "$BODY")
  call POST "/api/apps/$PROJECT/conversations" \
    "$(jq -nc --arg f "$TO" --arg t "$FROM" --arg k "$TOKEN" '{fix: {outage: {from: $f, to: $t}}, token: $k}')"
  BACKWARDS="$STATUS $(jq -r '.error.code // empty' "$BODY")"
  call POST "/api/apps/$PROJECT/conversations" \
    "$(jq -nc --argjson o "$OUTAGE" --arg k "$TOKEN" '{fix: {outage: $o}, token: $k}')"
  FIXED=$STATUS
  FIX=$(jq -r '.id // empty' "$BODY")
  TITLE=$(jq -r '.title // empty' "$BODY")
  ASKED=$(sql "select body from messages where conversation_id = '$FIX' order by seq" | jq -c '[.[] | .body | fromjson | select(.kind == "asked")][0] // {}')
  if [ "$FIXED" = 201 ] && [ "$TITLE" = "$OUTAGE_WORDS" ] && [ "$BACKWARDS" = '400 CHANGE_INVALID' ] &&
    printf '%s' "$ASKED" | jq -e --arg w "$OUTAGE_WORDS" --argjson o "$OUTAGE" '.words == $w and .fix == {outage: $o}' > /dev/null; then
    ok 6 "the outage's fix → 201 \"$TITLE\", kept as $(printf '%s' "$ASKED" | jq -c .fix); to before from → $BACKWARDS"
  else
    no 6 "the outage's fix" "→ $FIXED \"$TITLE\", kept as $(printf '%s' "$ASKED" | jq -c '{words, fix}'); to before from → $BACKWARDS"
  fi

  # 7. The owner's DELETE (Decision 11): the round on the fix stopped first, our rows for the app
  #    gone, no longer watching, and its history a stranger's (404).
  sleep 1
  call DELETE "/api/apps/$PROJECT"
  DELETED=$STATUS
  sleep 3
  ROWS=$(sql "select (select count(*) from apps where project_id = '$PROJECT') + (select count(*) from members where project_id = '$PROJECT') + (select count(*) from watch_tokens where project_id = '$PROJECT') + (select count(*) from history where project_id = '$PROJECT') + (select count(*) from conversations where project_id = '$PROJECT') + (select count(*) from runs where conversation_id = '$FIX') as n" | jq -r '.[0].n')
  call GET "/api/apps/$PROJECT/keeping"
  WATCHING=$(jq -r .watching "$BODY")
  call GET "/api/apps/$PROJECT/history"
  GONE=$STATUS
  if [ "$DELETED" = 204 ] && [ "$ROWS" = 0 ] && [ "$WATCHING" = false ] && [ "$GONE" = 404 ]; then
    ok 7 "the owner's DELETE → 204; 0 rows for the app (its fix's round stopped, none written after); not watching; history → 404"
  else
    no 7 "the owner's DELETE" "→ $DELETED; $ROWS rows left; watching $WATCHING; history → $GONE"
  fi
}

STATUS_ONE=0
STATUS_TWO=0
if [ "$HALF" != 2 ]; then
  half_one
  STATUS_ONE=$?
  echo "$passed passed, $failed failed"
  [ "$STATUS_ONE" = 0 ] && [ "$failed" != 0 ] && STATUS_ONE=1
fi
if [ "$HALF" != 1 ]; then
  echo
  (cd "$ROOT" && pnpm exec tsx scripts/check-keeping.ts 2> >(grep -v 'ExperimentalWarning\|trace-warnings' >&2))
  STATUS_TWO=$?
fi
[ "$STATUS_ONE" = 0 ] && [ "$STATUS_TWO" = 0 ]
