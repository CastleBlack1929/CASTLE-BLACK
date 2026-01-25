#!/bin/bash
set -e

PID_FILE="/tmp/castle-black-rate-proxy.pid"

if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE")"
  if kill "$PID" >/dev/null 2>&1; then
    echo "Proxy detenido."
  fi
  rm -f "$PID_FILE"
else
  pkill -f "rate-proxy.py" >/dev/null 2>&1 || true
  echo "Proxy detenido."
fi
