#!/bin/bash
# THE END OF A SITTING, as every sitting has done it by hand (ORIENTATION §5, §6 and §7's notes
# on stopping our server's tree), in order:
#
#   a. stop our server's whole tree: each `tsx/dist/cli.mjs watch … src/main.ts` of THIS
#      checkout, everything under it (the server on 7105, esbuild) and its `pnpm` parents,
#      `kill -9`, one pid at a time. Idle watchers that never took 7105 are stopped too (§7:
#      sitting 6 found twelve). Anything else still on 7105 is named, never stopped;
#   b. move the dev database aside, with its -wal and -shm, as `app-before-<name>.sqlite`
#      (only with our server stopped: a live server writes the -wal);
#   c. start `nohup pnpm dev:mock` again, on a fresh dev database, and wait for
#      `GET /api/__doctor`. Our mock on 7102 must already answer: this never starts or stops it;
#   d. the five acceptance scripts, check-seeing.sh first and check-going-live.sh second (while
#      the mock's app is free), then check-slice.sh, check-describing.sh, check-building.sh;
#   e. the four gates, `pnpm test` twice. Before each Vitest run it WAITS while the platform's
#      own Vitest runs (a process whose working directory is manifest's): ours would load the
#      machine its test tiers time against. A HOLD agreed by message is still yours to keep;
#   f. `pgrep -fl vitest`, ours named if any is left.
#
#   bash scripts/close-out.sh --keep-as f6s4 --logs <dir> [--dry-run] [--steps a,b,c,d,e,f]
#
#   --keep-as NAME  the old dev database's name: .data/app-before-NAME.sqlite (needed for b)
#   --logs DIR      every step's output (default: a new directory under $TMPDIR)
#   --steps LIST    which steps, e.g. `d,e,f` to run the checks again on a running server
#   --dry-run       print every step, and what a stops now, and change nothing
#
# It ends 0 only when every step it ran passed. bash 3.2 and the BSD userland (macOS).
set -u

ROOT=$(cd "$(dirname "$0")/.." && pwd)
PLATFORM=/Users/rich/Developer/manifest
APP=http://127.0.0.1:7105
MOCK=http://127.0.0.1:7102
DATA=$ROOT/packages/server/.data
ACCEPTANCE='check-seeing check-going-live check-slice check-describing check-building'

DRY=0
KEEP=''
LOGS=''
STEPS='a b c d e f'
WAIT_MINUTES=${WAIT_MINUTES:-60}

usage() { sed -n '2,32p' "$0" | sed 's/^# \{0,1\}//'; }
while [ $# -gt 0 ]; do
  case $1 in
    --dry-run) DRY=1 ;;
    --keep-as) KEEP=${2:-}; shift ;;
    --logs) LOGS=${2:-}; shift ;;
    --steps) STEPS=$(printf '%s' "${2:-}" | tr ',' ' '); shift ;;
    -h | --help) usage; exit 0 ;;
    *) echo "close-out: unknown argument $1" >&2; usage >&2; exit 2 ;;
  esac
  shift
done

wants() { case " $STEPS " in *" $1 "*) return 0 ;; esac; return 1; }
for step in $STEPS; do
  case $step in a | b | c | d | e | f) ;; *) echo "close-out: no step '$step' (a–f)" >&2; exit 2 ;; esac
done
if wants b; then
  case $KEEP in
    '') echo 'close-out: step b needs --keep-as NAME (the old database is kept as app-before-NAME.sqlite)' >&2; exit 2 ;;
    *[!A-Za-z0-9._-]*) echo "close-out: --keep-as '$KEEP': letters, digits, . _ - only" >&2; exit 2 ;;
  esac
  for suffix in '' -wal -shm; do
    if [ -e "$DATA/app-before-$KEEP.sqlite$suffix" ]; then
      echo "close-out: $DATA/app-before-$KEEP.sqlite$suffix exists already: choose another name" >&2
      exit 2
    fi
  done
fi
if [ -z "$LOGS" ]; then LOGS="${TMPDIR:-/tmp}/close-out-$(date +%Y%m%dT%H%M%S)"; fi
[ "$DRY" = 1 ] || mkdir -p "$LOGS"

STARTED=$(date +%s)
SUMMARY=''
FAILED=0
say() { printf '%s %s\n' "$(date +%H:%M:%S)" "$*"; }
step() { printf '\n%s ==== %s\n' "$(date +%H:%M:%S)" "$*"; }
would() { say "  (dry run) would: $*"; }
result() { # result PASS|FAIL text
  SUMMARY="$SUMMARY
  $1  $2"
  [ "$1" = PASS ] || FAILED=$((FAILED + 1))
  say "$1 $2"
}
listening() { lsof -nP -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null; }
doctor() { curl -s -m 2 "$APP/api/__doctor" 2>/dev/null; }
command_of() { ps -o command= -p "$1" 2>/dev/null | cut -c1-150; }

# Our server's watchers: tsx's `watch` of src/main.ts, from this checkout (never another's).
watchers() {
  ps -axo pid=,command= |
    awk -v root="$ROOT" 'index($0, "tsx/dist/cli.mjs watch") && index($0, "src/main.ts") && index($0, root) { print $1 }'
}
children() { ps -axo pid=,ppid= | awk -v parent="$1" '$2 == parent { print $1 }'; }
descendants() {
  local child
  for child in $(children "$1"); do
    echo "$child"
    descendants "$child"
  done
}
# The `pnpm` processes above a watcher (`pnpm --filter … dev`, `pnpm dev:mock`), up to the first
# that is not pnpm (a shell, launchd).
pnpm_parents() {
  local pid=$1 parent
  while :; do
    parent=$(ps -o ppid= -p "$pid" 2>/dev/null | tr -d ' ')
    [ -n "$parent" ] && [ "$parent" -gt 1 ] || return 0
    case $(ps -o command= -p "$parent" 2>/dev/null) in
      *bin/pnpm*) echo "$parent"; pid=$parent ;;
      *) return 0 ;;
    esac
  done
}
# The platform's Vitest: a vitest process whose working directory is manifest's, not ours.
platform_vitest() {
  local pid cwd
  for pid in $(pgrep -f vitest); do
    cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')
    case $cwd in
      "$ROOT" | "$ROOT"/*) ;;
      "$PLATFORM" | "$PLATFORM"/*) printf '%s ' "$pid" ;;
    esac
  done
}
wait_for_platform() {
  local running waited=0
  running=$(echo $(platform_vitest))
  if [ "$DRY" = 1 ]; then
    would "wait while the platform's Vitest runs (now: ${running:-none running})"
    return 0
  fi
  while [ -n "$running" ]; do
    if [ "$waited" -ge "$WAIT_MINUTES" ]; then
      say "the platform's Vitest has run for $WAIT_MINUTES minutes while we waited (pids $running)"
      return 1
    fi
    say "the platform's Vitest is running (pids $running): waiting a minute"
    sleep 60
    waited=$((waited + 1))
    running=$(echo $(platform_vitest))
  done
  return 0
}

say "close-out of $ROOT; logs in $LOGS; steps: $STEPS$([ "$DRY" = 1 ] && echo ' (DRY RUN: nothing is changed)')"

# ---- a. stop our server's whole tree ----
if wants a; then
  step 'a. stop our server: each watcher of this checkout, what is under it, and its pnpm parents'
  TREE=''
  for watcher in $(watchers); do
    TREE="$TREE $watcher $(descendants "$watcher") $(pnpm_parents "$watcher")"
  done
  TREE=$(printf '%s\n' $TREE | awk 'NF && !seen[$1]++')
  if [ -z "$TREE" ]; then
    say 'no watcher of ours is running'
  fi
  for pid in $TREE; do
    say "  $pid  $(command_of "$pid")"
  done
  if [ "$DRY" = 1 ]; then
    [ -z "$TREE" ] || would "kill -9 each of: $(echo $TREE)"
    would "wait for 7105 to be free (now held by: $(echo $(listening 7105)))"
  else
    for pid in $TREE; do kill -9 "$pid" 2> /dev/null; done
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      [ -z "$(listening 7105)" ] && break
      sleep 1
    done
    LEFT=$(listening 7105)
    if [ -n "$LEFT" ]; then
      for pid in $LEFT; do say "  still on 7105, not ours to stop: $pid  $(command_of "$pid")"; done
      result FAIL 'a. our server stopped: 7105 is still held'
    elif [ -n "$(watchers)" ]; then
      result FAIL "a. our server stopped: watchers left $(echo $(watchers))"
    else
      result PASS "a. our server stopped ($(echo $TREE | wc -w | tr -d ' ') processes); 7105 free"
    fi
  fi
fi

# ---- b. move the dev database aside ----
if wants b; then
  step "b. move the dev database aside as app-before-$KEEP.sqlite"
  if [ "$DRY" = 1 ]; then
    for suffix in '' -wal -shm; do
      [ -e "$DATA/app.sqlite$suffix" ] && would "mv $DATA/app.sqlite$suffix $DATA/app-before-$KEEP.sqlite$suffix"
    done
  elif [ -n "$(listening 7105)" ] || [ -n "$(watchers)" ]; then
    result FAIL 'b. the database moved: our server is running (step a first)'
  elif [ ! -e "$DATA/app.sqlite" ]; then
    result FAIL "b. the database moved: there is no $DATA/app.sqlite"
  else
    for suffix in '' -wal -shm; do
      [ -e "$DATA/app.sqlite$suffix" ] && mv -n "$DATA/app.sqlite$suffix" "$DATA/app-before-$KEEP.sqlite$suffix"
    done
    if [ -e "$DATA/app.sqlite" ]; then
      result FAIL 'b. the database moved: app.sqlite is still there'
    else
      result PASS "b. the database moved: $(cd "$DATA" && echo app-before-$KEEP.sqlite*)"
    fi
  fi
fi

# ---- c. start our server again, in mock mode ----
if wants c; then
  step 'c. start `nohup pnpm dev:mock`, and wait for /api/__doctor'
  MOCK_ME=$(curl -s -m 3 -o /dev/null -w '%{http_code}' -H 'cookie: manifest_session=mock-session' "$MOCK/v1/me")
  if [ "$DRY" = 1 ]; then
    say "  our mock on 7102 answers GET /v1/me: $MOCK_ME (it must be 200; this never starts it)"
    would "cd $ROOT && nohup pnpm dev:mock > $LOGS/dev-mock.log 2>&1 &"
    would "wait up to 90 s for GET $APP/api/__doctor to answer {\"name\":\"manifest-app\"}"
  elif [ "$MOCK_ME" != 200 ]; then
    result FAIL "c. our server started: our mock on 7102 answered $MOCK_ME (start \`pnpm mock\` first)"
  elif [ -n "$(listening 7105)" ]; then
    result FAIL "c. our server started: 7105 is held already by $(echo $(listening 7105))"
  else
    (cd "$ROOT" && nohup pnpm dev:mock > "$LOGS/dev-mock.log" 2>&1 &)
    for _ in $(seq 1 90); do
      [ "$(doctor)" = '{"name":"manifest-app"}' ] && break
      sleep 1
    done
    if [ "$(doctor)" = '{"name":"manifest-app"}' ]; then
      result PASS "c. our server started in mock mode: $(echo $(watchers)) watching; doctor answers (log $LOGS/dev-mock.log)"
    else
      result FAIL "c. our server started: no doctor after 90 s (log $LOGS/dev-mock.log)"
    fi
  fi
fi

# ---- d. the five acceptance scripts ----
if wants d; then
  step 'd. the five acceptance scripts, in mock mode (check-seeing first, check-going-live second)'
  for name in $ACCEPTANCE; do
    if [ "$DRY" = 1 ]; then
      would "bash $ROOT/scripts/$name.sh > $LOGS/$name.log 2>&1"
      continue
    fi
    if [ "$(doctor)" != '{"name":"manifest-app"}' ]; then
      result FAIL "d. $name: our server does not answer on 7105"
      continue
    fi
    began=$(date +%s)
    bash "$ROOT/scripts/$name.sh" > "$LOGS/$name.log" 2>&1
    status=$?
    tally=$(grep -E '^[0-9]+ passed, [0-9]+ failed$' "$LOGS/$name.log" | tail -1)
    result "$([ $status = 0 ] && echo PASS || echo FAIL)" \
      "d. $name.sh: ${tally:-no tally (exit $status)}, $(($(date +%s) - began)) s ($LOGS/$name.log)"
  done
fi

# ---- e. the four gates, the tests twice ----
if wants e; then
  step 'e. the four gates: pnpm test twice, lint, typecheck, format:check'
  for gate in test-1 test-2 lint typecheck format-check; do
    case $gate in
      test-*) command='pnpm test' ;;
      format-check) command='pnpm format:check' ;;
      *) command="pnpm $gate" ;;
    esac
    case $gate in test-*) wait_for_platform || {
      result FAIL "e. $gate: not run, the platform's Vitest never finished"
      continue
    } ;; esac
    if [ "$DRY" = 1 ]; then
      would "cd $ROOT && $command > $LOGS/$gate.log 2>&1"
      continue
    fi
    began=$(date +%s)
    (cd "$ROOT" && $command) > "$LOGS/$gate.log" 2>&1
    status=$?
    case $gate in
      test-*) tally=$(grep -E '^ +(Test Files|Tests) ' "$LOGS/$gate.log" | sed 's/^ *//' | tr -s ' ' | paste -sd ';' -) ;;
      *) tally=$(tail -3 "$LOGS/$gate.log" | tr -s ' \n' ' ' | cut -c1-120) ;;
    esac
    result "$([ $status = 0 ] && echo PASS || echo FAIL)" \
      "e. $command: ${tally:-exit $status}, $(($(date +%s) - began)) s ($LOGS/$gate.log)"
  done
fi

# ---- f. no Vitest of ours left behind ----
if wants f; then
  step 'f. pgrep -fl vitest'
  if [ "$DRY" = 1 ]; then
    would 'pgrep -fl vitest, and name any whose working directory is ours'
  else
    pgrep -fl vitest | cut -c1-160
    OURS=''
    for pid in $(pgrep -f vitest); do
      cwd=$(lsof -a -p "$pid" -d cwd -Fn 2> /dev/null | sed -n 's/^n//p')
      case $cwd in "$ROOT" | "$ROOT"/*) OURS="$OURS $pid" ;; esac
    done
    if [ -n "$OURS" ]; then
      result FAIL "f. no Vitest of ours left: $OURS (stop them by pid)"
    else
      result PASS 'f. no Vitest of ours left'
    fi
  fi
fi

step "close-out: $(($(date +%s) - STARTED)) s"
if [ "$DRY" = 1 ]; then
  say 'dry run: nothing was changed'
  exit 0
fi
printf '%s\n' "$SUMMARY"
[ "$FAILED" = 0 ]
