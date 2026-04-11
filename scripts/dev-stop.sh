#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_FILE="${ROOT_DIR}/.openclaw/dev-runtime/active-session.json"
MODE="${1:-push}"

if [[ ! -f "$STATE_FILE" ]]; then
  echo "No active dev session found" >&2
  exit 1
fi

python3 - <<'PY' "$STATE_FILE" "$MODE"
import json, os, signal, subprocess, sys
from pathlib import Path

state_path = Path(sys.argv[1])
mode = sys.argv[2]
state = json.loads(state_path.read_text())
root = str(state_path.parents[2])
branch = state['branch']
base_branch = state['baseBranch']

for key in ('tunnelPid', 'devPid'):
    pid = state.get(key)
    if pid:
        try:
            os.kill(pid, signal.SIGTERM)
        except ProcessLookupError:
            pass

if mode == 'push':
    subprocess.run(['git', '-C', root, 'push', '-u', 'origin', branch], check=True)
elif mode == 'discard':
    subprocess.run(['git', '-C', root, 'checkout', '--', '.'], check=False)

subprocess.run(['git', '-C', root, 'checkout', base_branch], check=True)
print(json.dumps({
    'branch': branch,
    'baseBranch': base_branch,
    'publicUrl': state['publicUrl'],
    'mode': mode,
}, indent=2))
state_path.unlink(missing_ok=True)
PY
