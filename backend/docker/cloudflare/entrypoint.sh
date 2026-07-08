#!/bin/bash
set -euo pipefail

mkdir -p /data/redis /usr/src/app/public /usr/src/app/private

echo "[entrypoint] Starting Redis..."
redis-server \
  --daemonize yes \
  --dir /data/redis \
  --appendonly yes \
  --save "" \
  --maxmemory 64mb \
  --maxmemory-policy allkeys-lru \
  --tcp-backlog 128 \
  --protected-mode no \
  --bind 127.0.0.1

for _ in $(seq 1 40); do
  if redis-cli ping >/dev/null 2>&1; then
    break
  fi
  sleep 0.1
done

export GATEWAY_PORT="${GATEWAY_PORT:-${PORT:-3000}}"
export APP_PORT="${APP_PORT:-3001}"
export PORT="${APP_PORT}"
export HOST="${HOST:-0.0.0.0}"
export REDIS_URI="${REDIS_URI:-redis://127.0.0.1:6379}"
export LISTEN_FIRST="${LISTEN_FIRST:-true}"

if [ ! -f /usr/src/app/dist/server.js ]; then
  echo "[entrypoint] ERROR: dist/server.js not found" >&2
  ls -la /usr/src/app/dist >&2 || true
  exit 1
fi

echo "[entrypoint] Starting gateway on port ${GATEWAY_PORT}..."
node /usr/src/app/docker/cloudflare/gateway.js &

echo "[entrypoint] Starting Ticketz API on port ${PORT}..."
exec node dist/server.js
