#!/bin/bash
# F1'S HEADLESS ACCEPTANCE (the plan's Task 8). It starts nothing: in mock mode, start
# `pnpm mock` and `pnpm dev:mock` first. It asserts BODIES, never a status alone, and every
# line says what it asked, what it wanted and what came back.
#
#   bash scripts/check-slice.sh              mock mode: http://127.0.0.1:7105, the mock on 7102
#   MODE=edge bash scripts/check-slice.sh    edge mode: https://app.manifest.internal
#
# bash 3.2 and the BSD userland (macOS): no associative arrays, no GNU flags.
set -u

MODE=${MODE:-mock}
case "$MODE" in
  mock) APP=${APP:-http://127.0.0.1:7105}; MOCK=${MOCK:-http://127.0.0.1:7102} ;;
  edge) APP=${APP:-https://app.manifest.internal} ;;
  *) echo "MODE is mock or edge, never '$MODE'" >&2; exit 2 ;;
esac

WORK=$(mktemp -d "${TMPDIR:-/tmp}/check-slice.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
JAR="$WORK/jar"
BODY="$WORK/body"
: > "$JAR"

passed=0
failed=0
STATUS=''

# get URL [curl args...]: sets STATUS, writes the body to $BODY, keeps cookies in $JAR.
get() {
  local url=$1
  shift
  STATUS=$(curl -sk -m 10 -o "$BODY" -w '%{http_code}' -c "$JAR" -b "$JAR" "$@" "$url") || STATUS=000
}

body() { tr -d '\n' < "$BODY" | cut -c1-160; }

# check N WHAT WANT-STATUS BODY-PATTERN: the status AND the body (a basic regex).
check() {
  local n=$1 what=$2 want=$3 pattern=$4
  if [ "$STATUS" = "$want" ] && grep -q -- "$pattern" "$BODY"; then
    passed=$((passed + 1))
    echo "ok   $n  $what → $STATUS, /$pattern/"
  else
    failed=$((failed + 1))
    echo "FAIL $n  $what: wanted $want and /$pattern/, got $STATUS: $(body)"
  fi
}

skip() { echo "skip $1  $2"; }

echo "F1 acceptance, $MODE mode, against $APP"

# Is anything there? Not a check of the slice: a message about what to start.
if [ "$MODE" = mock ]; then
  get "$MOCK/v1/openapi.json"
  # Without a cookie the document answers 401, by the contract's own global `security`
  # (sitting 1): that envelope is still proof a Manifest API is there.
  if ! { [ "$STATUS" = 401 ] && grep -q UNAUTHENTICATED "$BODY"; } &&
    ! { [ "$STATUS" = 200 ] && grep -q '"openapi"' "$BODY"; }; then
    echo "manifest-mock does not answer on $MOCK (got $STATUS). Start it: pnpm mock" >&2
    exit 2
  fi
fi
get "$APP/"
if [ "$STATUS" = 000 ]; then
  echo "Nothing answers on $APP. Start it: pnpm dev:mock (or pnpm dev for the edge)" >&2
  exit 2
fi
: > "$JAR"

# 1. The app itself.
get "$APP/" -H 'accept: text/html'
check 1 "GET /" 200 '<div id="root">'

# 2. The platform's refusal, passed through to the page untouched: its envelope has a hint.
get "$APP/v1/me"
check 2 "GET /v1/me, signed out (the platform's)" 401 '"code":"UNAUTHENTICATED","message"'

# 3. OUR refusal: exactly our envelope, with no message of the platform's.
get "$APP/api/me"
check 3 "GET /api/me, signed out (ours)" 401 '^{"error":{"code":"UNAUTHENTICATED"}}$'

if [ "$MODE" = mock ]; then
  # 4. Sign in: the mock fakes CWL, sets the session and sends us back.
  get "$APP/auth/login?returnTo=/"
  if [ "$STATUS" = 302 ] && grep -q 'manifest_session	mock-session' "$JAR"; then
    passed=$((passed + 1))
    echo "ok   4  GET /auth/login?returnTo=/ → 302, the jar holds manifest_session"
  else
    failed=$((failed + 1))
    echo "FAIL 4  GET /auth/login?returnTo=/: wanted 302 and manifest_session in the jar, got $STATUS"
  fi

  # 5. The platform knows them.
  get "$APP/v1/me"
  check 5 "GET /v1/me, signed in (the platform's)" 200 '"displayName":"[^"]'
  platform_id=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$BODY")

  # 6. So do we, and it is the same person.
  get "$APP/api/me"
  check 6 "GET /api/me, signed in (ours)" 200 '"displayName":"[^"]'
  our_id=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$BODY")
  if [ -n "$platform_id" ] && [ "$platform_id" = "$our_id" ]; then
    passed=$((passed + 1))
    echo "ok   6b /api/me's id is /v1/me's: $our_id"
  else
    failed=$((failed + 1))
    echo "FAIL 6b /api/me's id '$our_id' is not /v1/me's '$platform_id'"
  fi

  # 7. manifest-mock accepts ANY session value (FE-26), so a nonsense one cannot be refused
  #    here. The server's identity.test.ts proves it against a fake that refuses, and edge
  #    mode proves it against the platform.
  skip 7 "a nonsense session: the mock accepts any session value (FE-26); run MODE=edge"
else
  skip "4-6" "signing in is a person typing a password at the IdP (Task 8, Step 4)"
  # The nonsense session is the ONLY cookie sent: the jar is emptied first (the final review).
  : > "$JAR"
  get "$APP/api/me" -H 'cookie: manifest_session=nonsense'
  check 7 "GET /api/me, a nonsense session" 401 '^{"error":{"code":"UNAUTHENTICATED"}}$'
fi

echo "$passed passed, $failed failed"
[ "$failed" = 0 ]
