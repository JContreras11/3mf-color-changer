#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${ROOT_DIR}/.openclaw/dev-runtime"
mkdir -p "$STATE_DIR"

TASK_NAME="${1:-dev-session}"
BRANCH_NAME="${2:-bot/${TASK_NAME}-$(date -u +%Y%m%d-%H%M%S)}"
SUBDOMAIN="${3:-}"
LOCLX_BIN="${LOCLX_BIN:-/snap/bin/loclx}"
STATE_FILE="${STATE_DIR}/active-session.json"
ORIGINS_FILE="${STATE_DIR}/allowed-dev-origins.json"
DEV_LOG="${STATE_DIR}/next-dev.log"
TUNNEL_LOG="${STATE_DIR}/loclx.log"

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

if [[ -f "$STATE_FILE" ]]; then
  echo "Active dev session exists: $STATE_FILE" >&2
  cat "$STATE_FILE"
  exit 1
fi

pkill -f 'next dev --turbopack' >/dev/null 2>&1 || true
pkill -f 'loclx tunnel http' >/dev/null 2>&1 || true

cd "$ROOT_DIR"
git fetch origin
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
  echo "Repo must be on main/master before starting dev session. Current: $current_branch" >&2
  exit 1
fi

git pull --ff-only origin "$current_branch"
git checkout -b "$BRANCH_NAME"

PORT="$(find_free_port)"
if [[ -z "$PORT" ]]; then
  echo "No free port found" >&2
  exit 1
fi

: > "$DEV_LOG"
: > "$TUNNEL_LOG"

LOCLX_ARGS=(tunnel http --to "127.0.0.1:${PORT}")
[[ -n "$SUBDOMAIN" ]] && LOCLX_ARGS+=(--subdomain "$SUBDOMAIN")
nohup "$LOCLX_BIN" "${LOCLX_ARGS[@]}" > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

PUBLIC_URL=""
for _ in $(seq 1 90); do
  PUBLIC_URL="$(grep -Eo 'https://[^[:space:]]+' "$TUNNEL_LOG" | head -n1 || true)"
  if [[ -z "$PUBLIC_URL" ]]; then
    host="$(grep -Eo '[a-zA-Z0-9.-]+\.loclx\.io' "$TUNNEL_LOG" | head -n1 || true)"
    if [[ -n "$host" ]]; then
      PUBLIC_URL="https://${host}"
    fi
  fi
  if [[ -n "$PUBLIC_URL" ]]; then
    break
  fi
  sleep 1
done

if [[ -z "$PUBLIC_URL" ]]; then
  echo "LocalXpose URL not detected" >&2
  kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  exit 1
fi

python3 - <<PY
import json
from pathlib import Path
url = ${PUBLIC_URL@Q}
Path(${ORIGINS_FILE@Q}).write_text(json.dumps({'origins': [url]}, indent=2) + '\n')
PY

nohup env ALLOWED_DEV_ORIGINS="$PUBLIC_URL" npm run dev -- --hostname 0.0.0.0 --port "$PORT" > "$DEV_LOG" 2>&1 &
DEV_PID=$!

for _ in $(seq 1 90); do
  if curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -fsS "http://127.0.0.1:${PORT}" >/dev/null 2>&1; then
  echo "next dev did not become ready" >&2
  kill "$DEV_PID" >/dev/null 2>&1 || true
  kill "$TUNNEL_PID" >/dev/null 2>&1 || true
  git checkout "$current_branch"
  git branch -D "$BRANCH_NAME" || true
  exit 1
fi

python3 - <<PY
import json
from pathlib import Path
state = {
  'task': ${TASK_NAME@Q},
  'branch': ${BRANCH_NAME@Q},
  'baseBranch': ${current_branch@Q},
  'port': int(${PORT}),
  'devPid': int(${DEV_PID}),
  'tunnelPid': int(${TUNNEL_PID}),
  'publicUrl': ${PUBLIC_URL@Q},
  'devLog': ${DEV_LOG@Q},
  'tunnelLog': ${TUNNEL_LOG@Q},
  'originsFile': ${ORIGINS_FILE@Q}
}
Path(${STATE_FILE@Q}).write_text(json.dumps(state, indent=2) + '\n')
print(json.dumps(state, indent=2))
PY
