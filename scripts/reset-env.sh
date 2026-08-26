#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

# Ensure .env is set up if missing
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi

echo "Stopping containers, clearing networks, and purging database volumes..."
docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.yml" down -v --remove-orphans

echo "Restarting application suite cleanly..."
# Call up.sh with all provided arguments
exec "$ROOT_DIR/scripts/up.sh" "$@"
