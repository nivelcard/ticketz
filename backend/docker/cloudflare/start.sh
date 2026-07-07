#!/bin/sh
set -eu

export PORT="${PORT:-3000}"
export REDIS_URI="${REDIS_URI:-redis://127.0.0.1:6379}"

exec /usr/bin/supervisord -c /etc/supervisor/conf.d/ticketz.conf
