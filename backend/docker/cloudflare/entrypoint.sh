#!/bin/bash
set -euo pipefail

mkdir -p /data/redis /usr/src/app/public /usr/src/app/private

redis-server --appendonly yes --dir /data/redis --daemonize yes

for _ in $(seq 1 30); do
  if (echo > /dev/tcp/127.0.0.1/6379) >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export REDIS_URI="${REDIS_URI:-redis://127.0.0.1:6379}"

exec node dist/server.js
