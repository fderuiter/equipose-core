#!/usr/bin/env sh
# Shared environment bootstrapper

# Compute and export ROOT_DIR safely
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
export ROOT_DIR

# Check for the existence of the local environment configuration and create it from the template if missing
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
fi
