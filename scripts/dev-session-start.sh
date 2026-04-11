#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${ROOT_DIR}/.openclaw/dev-sessions"
mkdir -p "$STATE_DIR"

SESSION_ID="${1:-$(date -u +%Y%m%d-%H%M%S)}"
BRANCH_NAME="${2:-bot/dev-${SESSION_ID}}"
SUBDOMAIN="${3:-}"
REGION="${LOCX_REGION:-}"
LOG_PREFIX="$STATE_DIR/$SESSION_ID"
DEV_LOG="${LOG_PREFIX}.next.log"
TUNNEL_LOG="${LOG_PREFIX}.loclx.log"
STATE_FILE="${LOG_PREFIX}.json"
WORKTREE_DIR="/home/ubuntu/dev-sessions/3mf-color-changer/${SESSION_ID}"
LOCLX_BIN="${LOCLX_BIN:-/snap/bin/loclx}"

find_free_port() {
  python3 - <<'PY'
import socket
for port in range(3101, 3201):
    with socket.socket() as s:
        try:
            s.bind(('127.0.0.1', port))
        except OSError:
            continue
        print(port)
        break
PY
}

PORT="$(find_free_port)"
if [[ -z "$PORT" ]]; then
  echo "No free port found" >&2
  exit 1
fi

cd "$ROOT_DIR"
git fetch origin

if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
  BRANCH_REF="$BRANCH_NAME"
else
  BRANCH_REF="origin/main"
fi

mkdir -p "$(dirname "$WORKTREE_DIR")"
if [[ -d "$WORKTREE_DIR" ]]; then
  echo "Worktree already exists: $WORKTREE_DIR" >&2
  exit 1
fi

if [[ "$BRANCH_REF" == "origin/main" ]]; then
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" origin/main
else
  git worktree add "$WORKTREE_DIR" "$BRANCH_NAME"
fi

cd "$WORKTREE_DIR"
if [[ ! -d node_modules ]]; then
  ln -s "$ROOT_DIR/node_modules" node_modules
fi

nohup npm run dev -- --hostname 127.0.0.1 --port "$PORT" > "$DEV_LOG" 2>&1 &
DEV_PID=$!

for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
  echo "Next dev server did not become ready" >&2
  kill "$DEV_PID" >/dev/null 2>&1 || true
  exit 1
fi

LOCLX_ARGS=(tunnel http --to "127.0.0.1:${PORT}")
[[ -n "$SUBDOMAIN" ]] && LOCLX_ARGS+=(--subdomain "$SUBDOMAIN")
[[ -n "$REGION" ]] && LOCLX_ARGS+=(--region "$REGION")

nohup "$LOCLX_BIN" "${LOCLX_ARGS[@]}" > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

PUBLIC_URL=""
for _ in $(seq 1 90); do
  PUBLIC_URL="$(grep -Eo 'https://[^[:space:]]+' "$TUNNEL_LOG" | head -n1 || true)"
  if [[ -n "$PUBLIC_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$PUBLIC_URL" ]]; then
  echo "LocalXpose URL not detected" >&2
  kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  kill "$DEV_PID" >/dev/null 2>&1 || true
  exit 1
fi

python3 - <<PY
import json
from pathlib import Path
state = {
  "sessionId": ${SESSION_ID@Q},
  "branch": ${BRANCH_NAME@Q},
  "port": int(${PORT}),
  "worktree": ${WORKTREE_DIR@Q},
  "devPid": int(${DEV_PID}),
  "tunnelPid": int(${TUNNEL_PID}),
  "publicUrl": ${PUBLIC_URL@Q},
  "devLog": ${DEV_LOG@Q},
  "tunnelLog": ${TUNNEL_LOG@Q}
}
Path(${STATE_FILE@Q}).write_text(json.dumps(state, indent=2) + "\n")
print(json.dumps(state, indent=2))
PY
