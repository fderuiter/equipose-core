#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

echo "Resetting local development environment..."

# 1. Stop containers and remove volumes, networks, and orphan containers
if [ -f "$ROOT_DIR/.env" ]; then
  docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.yml" down -v --remove-orphans
else
  docker compose -f "$ROOT_DIR/docker-compose.yml" down -v --remove-orphans
fi

# 2. Clean up local .env if desired or keep it
if [ -f "$ROOT_DIR/.env" ]; then
  echo "Removing local .env file..."
  rm "$ROOT_DIR/.env"
fi

echo "Environment successfully reset to clean-slate state! Run ./scripts/up.sh to reboot and re-seed."
