#!/usr/bin/env sh
set -eu

# Get the absolute root directory of the repository
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

# Check if force flag is provided (helpful for non-interactive tests/automation)
FORCE=false
for arg in "$@"; do
  if [ "$arg" = "-f" ] || [ "$arg" = "--force" ]; then
    FORCE=true
  fi
done

# Require confirmation unless force flag is specified
if [ "$FORCE" = false ]; then
  printf "This will stop all containers, delete cached database volumes, and restore configurations. Are you sure? [y/N]: "
  # Read user input from standard input
  read -r CONFIRM
  if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Reset aborted."
    exit 0
  fi
fi

echo "Stopping active containers and removing associated volumes..."
if [ -f "$ROOT_DIR/.env" ]; then
  docker compose --env-file "$ROOT_DIR/.env" -f "$ROOT_DIR/docker-compose.yml" down -v --remove-orphans || true
else
  docker compose -f "$ROOT_DIR/docker-compose.yml" down -v --remove-orphans || true
fi

echo "Cleaning up local workspace caches and dependency folders..."
if [ -d "$ROOT_DIR/gateway/auth-service/node_modules" ]; then
  echo "Removing gateway/auth-service/node_modules..."
  rm -rf "$ROOT_DIR/gateway/auth-service/node_modules"
fi

echo "Restoring clean environment files from examples..."
if [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  echo "Restored .env configuration file."
fi

if [ -f "$ROOT_DIR/docker/.env.example" ]; then
  cp "$ROOT_DIR/docker/.env.example" "$ROOT_DIR/docker/.env"
  echo "Restored docker/.env configuration file."
fi

echo "Environment reset completed successfully!"
exit 0
