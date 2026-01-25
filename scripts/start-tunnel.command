#!/bin/bash
set -e

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared no está instalado."
  echo "Instálalo con: brew install cloudflared"
  exit 1
fi

cloudflared tunnel --url http://localhost:8787
