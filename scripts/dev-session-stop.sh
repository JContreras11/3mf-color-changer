#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${ROOT_DIR}/.openclaw/dev-sessions"
SESSION_ID="${1:?Usage: scripts/dev-session-stop.sh <session-id> [--push]}"
PUSH_CHANGES="${2:-}"
STATE_FILE="${STATE_DIR}/${SESSION_ID}.json"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "State file not found: $STATE_FILE" >&2
  exit 1
fi

python3 - <<'PY' "$STATE_FILE" "$PUSH_CHANGES"
import json, os, signal, subprocess, sys
from pathlib import Path

state_path = Path(sys.argv[1])
push = sys.argv[2] == '--push'
state = json.loads(state_path.read_text())

for key in ('tunnelPid', 'devPid'):
    pid = state.get(key)
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass

branch = state['branch']
worktree = state['worktree']

if push:
    subprocess.run(['git', '-C', worktree, 'status', '--short'], check=False)
    subprocess.run(['git', '-C', worktree, 'push', '-u', 'origin', branch], check=True)

print(json.dumps({
    'sessionId': state['sessionId'],
    'branch': branch,
    'worktree': worktree,
    'publicUrl': state['publicUrl'],
    'pushed': push,
}, indent=2))
PY
