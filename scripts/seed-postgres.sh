#!/usr/bin/env bash
set -e

if [ "${APP_ENV:-dev}" = "production" ] || [ "${NODE_ENV:-dev}" = "production" ]; then
  echo "WARNING: Relational database seeding blocked in production!"
  exit 0
fi

echo "Running automated relational database seeding for ${POSTGRES_DB}..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f /init-postgres.sql
