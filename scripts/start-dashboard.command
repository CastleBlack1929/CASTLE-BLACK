#!/bin/bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="/tmp/castle-black-rate-proxy.pid"
LOG_FILE="/tmp/castle-black-rate-proxy.log"

if pgrep -f "rate-proxy.py" >/dev/null; then
  echo "Proxy ya estaba corriendo."
else
  cd "$ROOT_DIR"
  nohup python3 scripts/rate-proxy.py >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  echo "Proxy iniciado."
fi

echo "Abre dashboard.html en tu navegador."
