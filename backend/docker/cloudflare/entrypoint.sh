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

for _ in $(seq 1 25); do
  if redis-cli ping >/dev/null 2>&1; then
    break
  fi
  sleep 0.2
done

export HOST="${HOST:-0.0.0.0}"
export GATEWAY_PORT="${GATEWAY_PORT:-3000}"
export APP_PORT="${APP_PORT:-3001}"
export PORT="${APP_PORT}"
export REDIS_URI="${REDIS_URI:-redis://127.0.0.1:6379}"
export LISTEN_FIRST="${LISTEN_FIRST:-true}"

echo "[entrypoint] Starting gateway on port ${GATEWAY_PORT}..."
node /usr/src/app/docker/cloudflare/gateway.js &
GATEWAY_PID=$!

cleanup() {
  kill "${GATEWAY_PID}" 2>/dev/null || true
}

trap cleanup EXIT

echo "[entrypoint] Starting Ticketz API on port ${APP_PORT}..."
exec node dist/src/server.js
