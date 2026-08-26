#!/usr/bin/env sh
set -eu

. "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/bootstrap.sh"

exec docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.yml" down "$@"
