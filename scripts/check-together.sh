#!/bin/bash
# F6b'S ACCEPTANCE AGAINST THE MOCK AND MAILPIT (the plan's Task 13, Step 1), in two halves:
#
#   1. OUR API, AS THE BROWSER DRIVES IT (this script, curl against `pnpm dev:mock`, as the other
#      scripts): the app's members kept through our watch's hand-over (the mock's: one owner, the
#      person signed in); a colleague's change on the app, which the owner reads and may stop, and
#      where every other change is 404; someone else's on an app we keep nobody for, 404; the token
#      ids our page hands over kept and listed, a secret never; no credential in any table.
#   2. EVERYONE ELSE, IN-PROCESS (`scripts/check-together.ts`, run by tsx): our server and keeper
#      asked by four people at once; a helper's side, a stranger, an owner's Stop, someone taken
#      off (by the event, and by a re-read alone), their agent's question and its email to each
#      owner. It needs Mailpit only.
#
#   bash scripts/check-together.sh            # both halves
#   HALF=1 bash scripts/check-together.sh     # our API only; HALF=2: in-process only
#
# WHY TWO HALVES: since the platform's sitting 10 the mock trusts only the one session it issues
# (FE-26), so a curl can be only its one person, Instructor One, the owner of its one app. Their
# colleague's work is written by our store's own API (`check-together.ts seed`), as our server would
# have written it.
#
# HALF ONE WRITES TO OUR DEV DATABASE, AND LEAVES IT AS IT FOUND IT: its last step is the owner's
# DELETE, which forgets the mock's app (every conversation on it, its history, members and watch),
# so run it AFTER check-seeing, check-going-live, check-slice, check-describing and check-building,
# and BEFORE check-keeping (whose first hand-over must be its first), with `pnpm mock` and
# `pnpm dev:mock` running and the mock's app free. It starts nothing.
#
#   CONTROL=secret  a secret written into a copy of the database's `minted`, and the scan pointed at
#                   the copy: check 8 goes red.
#
# bash 3.2 and the BSD userland (macOS): no associative arrays, no GNU flags. Needs jq and node.
set -u

APP=${APP:-http://127.0.0.1:7105}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DB=${DB:-$ROOT/packages/server/.data/app.sqlite}
HALF=${HALF:-both}
CONTROL=${CONTROL:-}

WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-together.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/jar"
BODY="$WORK/body"
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
SCAN=$DB

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

body() { tr -d '\n' < "$BODY" | cut -c1-200; }
ok() { passed=$((passed + 1)); echo "ok   $1  $2"; }
no() { failed=$((failed + 1)); echo "FAIL $1  $2: $3"; }
uuid() { uuidgen | tr 'A-Z' 'a-z'; }
# named ID WHAT: a token whose secret names its id, as the platform's does (`mft_<id>_<secret>`):
# our hand-overs refuse an id the secret does not name (m122, m83). The mock accepts any Bearer, and
# answers one fixed token id to every mint, so a run names ids of its own.
named() { printf 'mft_%s_together_check_%s' "$(printf '%s' "$1" | tr -d '-')" "$2"; }

# sql QUERY: rows as JSON, read behind the store's back.
sql() {
  node -e "
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(process.argv[1], { readOnly: true })
    console.log(JSON.stringify(db.prepare(process.argv[2]).all()))
  " "$DB" "$1" 2> /dev/null
}
tsx() { (cd "$ROOT" && pnpm exec tsx scripts/check-together.ts "$@" 2> /dev/null); }

half_one() {
  echo "F6b acceptance, half one: our API, mock mode, against $APP"
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
  if [ "$STATUS" != 302 ] || ! jar_holds "$SESSION_NAME"; then
    no 0 "signing in" "wanted 302 and a session, got $STATUS"
    return 1
  fi
  call GET /api/me
  ME=$(jq -c '{id, displayName, email}' "$BODY")
  ME_ID=$(printf '%s' "$ME" | jq -r .id)
  ok 0 "signed in through the mock's CWL, as $(printf '%s' "$ME" | jq -r .displayName)"

  call GET /v1/projects
  PROJECT_JSON=$(jq -c '(if type == "array" then . else .projects end)[0] | {id, name, slug}' "$BODY")
  PROJECT=$(printf '%s' "$PROJECT_JSON" | jq -r '.id // empty')
  if [ -z "$PROJECT" ]; then
    echo "The mock listed no project: $(body)" >&2
    return 2
  fi
  HELD_RULE='[.[] | select((.state | IN("making","planning","plan-ready","agreed","paused","waiting")) or (.state == "building" and .chip != "notyet")) | {title, state}]'
  call GET "/api/apps/$PROJECT/conversations"
  HELD=$(jq -c "$HELD_RULE" "$BODY")
  if [ "$HELD" != '[]' ]; then
    echo "The mock's app is held or waited on by an older conversation: $HELD" >&2
    echo "Run this after the other acceptance scripts, on a dev database whose app is free (ORIENTATION §7)." >&2
    return 2
  fi

  # 1. Our watch, minted in the person's session and handed over: the keeper reads the app's
  #    members with it, and keeps them (the mock's: one owner, the person signed in).
  call POST "/v1/projects/$PROJECT/tokens" \
    '{"name":"Keeping watch","capabilities":["project:read","output:read"],"expiresInDays":365}'
  WATCH_ID=$(uuid)
  MINTED=$(jq -c --arg id "$WATCH_ID" --arg t "$(named "$WATCH_ID" watch)" '{token: $t, tokenId: $id, expiresAt: .token.expiresAt}' "$BODY")
  SECRET=$(jq -r '.secret // empty' "$BODY")
  call POST "/api/apps/$PROJECT/keeping" "$MINTED"
  HANDED="$STATUS $(jq -c '{watching, kept}' "$BODY")"
  sleep 1
  MEMBERS=$(sql "select user_id, role from members where project_id = '$PROJECT'")
  if printf '%s' "$HANDED" | grep -Eq '^(201|200) ' &&
    printf '%s' "$MEMBERS" | jq -e --arg me "$ME_ID" 'length >= 1 and any(.[]; .user_id == $me and .role == "owner")' > /dev/null; then
    ok 1 "the watch handed over → $HANDED; the keeper keeps the members: $(printf '%s' "$MEMBERS" | jq -c '[.[] | .role]')"
  else
    no 1 "the members kept through the hand-over" "→ $HANDED; members $MEMBERS"
  fi

  # 2. A colleague's change on the app (planned, waiting for its yes: it holds the app), written by
  #    our store's own API; the owner reads it, and the app's list says who started it.
  ELSEWHERE=$(uuid)
  COLLEAGUE=$(jq -nc --arg id "$(uuid)" '{id: $id, displayName: "Colleague One", email: "colleague@together-check.test"}')
  SEEDED=$(tsx seed "$DB" "$(jq -nc --argjson p "$PROJECT_JSON" --argjson c "$COLLEAGUE" --argjson me "$ME" --arg e "$ELSEWHERE" '{project: $p, colleague: $c, me: $me, elsewhere: $e}')")
  THEIRS=$(printf '%s' "$SEEDED" | jq -r '.theirs // empty')
  STRANGER=$(printf '%s' "$SEEDED" | jq -r '.stranger // empty')
  MINE=$(printf '%s' "$SEEDED" | jq -r '.mine // empty')
  if [ -z "$THEIRS" ] || [ -z "$STRANGER" ] || [ -z "$MINE" ]; then
    no 2 "a colleague's change written" "the seed answered: $SEEDED"
    return 1
  fi
  call GET "/api/conversations/$THEIRS"
  READ="$STATUS $(jq -r '.state // empty' "$BODY")"
  call GET "/api/apps/$PROJECT/conversations"
  BY=$(jq -r --arg id "$THEIRS" '.[] | select(.id == $id) | .by.name' "$BODY")
  if [ "$READ" = '200 plan-ready' ] && [ "$BY" = 'Colleague One' ]; then
    ok 2 "the owner reads a colleague's change → $READ; the app's list: started by $BY"
  else
    no 2 "the owner reads a colleague's" "→ $READ; the list's by: '$BY'"
  fi

  # 3. Every change route on the colleague's: 404, and nothing changed (Decision 2).
  BEFORE=$(sql "select (select state from conversations where id = '$THEIRS') || ' ' || (select count(*) from messages where conversation_id = '$THEIRS') as s" | jq -r '.[0].s')
  ANSWERED=''
  for route in build messages answers plan plan/correction plan/agree project; do
    case $route in
      build | plan) json='{}' ;;
      messages) json='{"words":"Make the title bigger, please."}' ;;
      answers) json='{"questionId":"q-1","words":"It closes at the deadline."}' ;;
      plan/correction) json='{"correction":"Twelve weeks, not ten."}' ;;
      plan/agree) json='{"version":1,"answers":[]}' ;;
      project)
        ID3=$(uuid)
        json=$(jq -nc --arg p "$PROJECT" --arg t "$(named "$ID3" theirs)" --arg id "$ID3" '{projectId: $p, token: $t, tokenId: $id}')
        ;;
    esac
    call POST "/api/conversations/$THEIRS/$route" "$json"
    ANSWERED="$ANSWERED $route:$STATUS"
  done
  AFTER=$(sql "select (select state from conversations where id = '$THEIRS') || ' ' || (select count(*) from messages where conversation_id = '$THEIRS') as s" | jq -r '.[0].s')
  OTHER=$(printf '%s\n' $ANSWERED | grep -vc ':404$')
  if [ "$OTHER" != 0 ]; then
    no 3 "every change route on the colleague's → 404" "$ANSWERED; $BEFORE → $AFTER"
  elif [ "$BEFORE" = "$AFTER" ]; then
    ok 3 "every change route on the colleague's → 404:$ANSWERED; nothing changed ($AFTER messages)"
  else
    no 3 "nothing changed" "$BEFORE → $AFTER"
  fi

  # 4. Someone else's on an app we keep nobody for: none of it is ours to read or stop.
  call GET "/api/conversations/$STRANGER"
  S_READ=$STATUS
  call POST "/api/conversations/$STRANGER/stop" '{}'
  S_STOP=$STATUS
  call GET "/api/apps/$ELSEWHERE/minted"
  S_MINTED=$STATUS
  if [ "$S_READ $S_STOP $S_MINTED" = '404 404 404' ]; then
    ok 4 "someone else's, on an app we keep nobody for: read → $S_READ, Stop → $S_STOP, its token ids → $S_MINTED"
  else
    no 4 "a stranger's" "read → $S_READ, Stop → $S_STOP, its token ids → $S_MINTED"
  fi

  # 5. The owner's Stop on the colleague's: set aside, recorded as the owner's, the app freed.
  call POST "/api/conversations/$THEIRS/stop" '{}'
  STOPPED=$STATUS
  sleep 1
  STATE=$(sql "select state from conversations where id = '$THEIRS'" | jq -r '.[0].state')
  RECORDED=$(sql "select body from messages where conversation_id = '$THEIRS' order by seq" | jq -c '[.[] | .body | fromjson | select(.kind == "set-aside") | {by, why}]')
  call GET "/api/apps/$PROJECT/conversations"
  HELD=$(jq -c --arg mine "$MINE" "[.[] | select(.id != \$mine)] | $HELD_RULE" "$BODY")
  if [ "$STOPPED" = 202 ] && [ "$STATE" = set-aside ] && [ "$HELD" = '[]' ] &&
    printf '%s' "$RECORDED" | jq -e --arg me "$ME_ID" 'length == 1 and .[0].by == $me and .[0].why == "stopped"' > /dev/null; then
    ok 5 "the owner's Stop on the colleague's → $STOPPED: $STATE, recorded as the owner's ($(printf '%s' "$RECORDED" | jq -c '[.[] | .why]')), nothing else holds the app"
  else
    no 5 "the owner's Stop" "→ $STOPPED; $STATE; recorded $RECORDED; held $HELD"
  fi

  # 6. A conversation's token handed over with its id (D5): kept, and listed as ours beside the watch.
  TOKEN_ID=$(uuid)
  call POST "/api/conversations/$MINE/project" \
    "$(jq -nc --arg p "$PROJECT" --arg t "$(named "$TOKEN_ID" mine)" --arg id "$TOKEN_ID" '{projectId: $p, token: $t, tokenId: $id}')"
  HANDED_OVER=$STATUS
  call GET "/api/apps/$PROJECT/minted"
  LISTED="$STATUS"
  OURS=$(jq -c '[.ours[] | {purpose, conversationId}]' "$BODY")
  if [ "$HANDED_OVER" = 204 ] && [ "$LISTED" = 200 ] &&
    jq -e --arg t "$TOKEN_ID" --arg w "$WATCH_ID" --arg c "$MINE" \
      'any(.ours[]; .tokenId == $t and .purpose == "conversation" and .conversationId == $c) and any(.ours[]; .tokenId == $w and .purpose == "watch")' "$BODY" > /dev/null; then
    ok 6 "a conversation's token handed over with its id → $HANDED_OVER; …/minted → $LISTED, ours: $OURS"
  else
    no 6 "the token ids kept" "hand-over → $HANDED_OVER; …/minted → $LISTED $(body)"
  fi

  # 7. An agent of their own, kept by its id alone; a secret beside it, or as its name, refused.
  AGENT_ID=$(uuid)
  UNTIL=$(date -u -v+30d +%Y-%m-%dT%H:%M:%S.000Z)
  call POST "/api/apps/$PROJECT/agents" \
    "$(jq -nc --arg id "$AGENT_ID" --arg u "$UNTIL" '{tokenId: $id, name: "Reading helper", expiresAt: $u}')"
  KEPT=$STATUS
  call POST "/api/apps/$PROJECT/agents" \
    "$(jq -nc --arg id "$(uuid)" --arg u "$UNTIL" --arg s "$SECRET" '{tokenId: $id, name: "Reading helper", expiresAt: $u, secret: $s}')"
  WITH_SECRET="$STATUS $(jq -r '.error.code // empty' "$BODY")"
  call POST "/api/apps/$PROJECT/agents" \
    "$(jq -nc --arg id "$(uuid)" --arg u "$UNTIL" '{tokenId: $id, name: "mft_live_0123456789abcdef", expiresAt: $u}')"
  AS_NAME="$STATUS $(jq -r '.error.code // empty' "$BODY")"
  call GET "/api/apps/$PROJECT/minted"
  # Its id alone: who made it is the platform's Token.mintedBy (FE-49), never our word.
  AGENTS=$(jq -c --arg a "$AGENT_ID" '[.agents[] | select(.tokenId == $a)]' "$BODY")
  if [ "$KEPT" = 201 ] && [ "$WITH_SECRET" = '400 AGENT_INVALID' ] && [ "$AS_NAME" = '400 AGENT_INVALID' ] &&
    [ "$AGENTS" = "[{\"tokenId\":\"$AGENT_ID\"}]" ]; then
    ok 7 "an agent kept by its id → $KEPT, listed by its id alone ($AGENTS); with a secret beside it → $WITH_SECRET; a secret as its name → $AS_NAME"
  else
    no 7 "an agent's id" "kept → $KEPT; with a secret → $WITH_SECRET; as its name → $AS_NAME; listed $AGENTS"
  fi

  # 8. No credential in the clear: no mft_ and no sk- in any table, the token ids ids only.
  if [ "$CONTROL" = secret ]; then
    SCAN="$WORK/copy.sqlite"
    node -e "
      const { DatabaseSync } = require('node:sqlite')
      const from = new DatabaseSync(process.argv[1], { readOnly: true })
      from.exec(\"vacuum into '\" + process.argv[2] + \"'\")
      from.close()
      const db = new DatabaseSync(process.argv[2])
      db.prepare('update minted set name = ? where token_id = ?').run(process.argv[3], process.argv[4])
      db.close()
    " "$DB" "$SCAN" "$SECRET" "$AGENT_ID"
  fi
  DUMP=$(node -e "
    const { DatabaseSync } = require('node:sqlite')
    const db = new DatabaseSync(process.argv[1], { readOnly: true })
    const tables = db.prepare(\"select name from sqlite_master where type = 'table'\").all()
    console.log(tables.map(({ name }) => JSON.stringify(db.prepare('select * from \"' + name + '\"').all())).join('\n'))
  " "$SCAN" 2> /dev/null)
  LEAKED=$(printf '%s\n' "$DUMP" | grep -Eo '(^|[^A-Za-z0-9_])(mft_|sk-)[A-Za-z0-9_-]{0,12}' | head -3 | tr '\n' ' ')
  ROWS=$(sql "select count(*) as n from minted where project_id = '$PROJECT'" | jq -r '.[0].n')
  if [ -n "$SECRET" ] && [ -n "$DUMP" ] && [ -z "$LEAKED" ] && [ "$ROWS" -ge 2 ]; then
    ok 8 "no mft_ and no sk- in any table ($(printf '%s' "$DUMP" | wc -c | tr -d ' ') bytes; $ROWS token ids kept for the app)"
  else
    no 8 "no credential in the clear" "leaked $LEAKED; $ROWS token ids"
  fi

  # 9. Left as found: the owner's DELETE forgets the mock's app (its watch, members, history, every
  #    conversation and token id on it), and the stranger's app is forgotten by our store's API.
  call DELETE "/api/apps/$PROJECT"
  DELETED=$STATUS
  sleep 2
  tsx forget "$DB" "$ELSEWHERE" > /dev/null
  LEFT=$(sql "select (select count(*) from conversations where project_id in ('$PROJECT', '$ELSEWHERE')) + (select count(*) from minted where project_id = '$PROJECT') + (select count(*) from members where project_id = '$PROJECT') + (select count(*) from watch_tokens where project_id = '$PROJECT') + (select count(*) from watched where project_id = '$PROJECT') as n" | jq -r '.[0].n')
  if [ "$DELETED" = 204 ] && [ "$LEFT" = 0 ]; then
    ok 9 "left as found: the owner's DELETE → $DELETED, the stranger's app forgotten; 0 rows for either"
  else
    no 9 "left as found" "DELETE → $DELETED; $LEFT rows left"
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
  (cd "$ROOT" && pnpm exec tsx scripts/check-together.ts 2> >(grep -v 'ExperimentalWarning\|trace-warnings' >&2))
  STATUS_TWO=$?
fi
[ "$STATUS_ONE" = 0 ] && [ "$STATUS_TWO" = 0 ]
