#!/usr/bin/env bash
set -e

if [ "${APP_ENV:-dev}" = "production" ] || [ "${NODE_ENV:-dev}" = "production" ]; then
  echo "WARNING: Graph database seeding blocked in production!"
  exit 0
fi

echo "Waiting for Neo4j to be ready..."
for i in $(seq 1 30); do
  if cypher-shell -a bolt://neo4j:7687 "RETURN 1" >/dev/null 2>&1; then
    echo "Neo4j is ready!"
    break
  fi
  echo "Neo4j not ready yet, retrying in 2 seconds (attempt $i)..."
  sleep 2
done

echo "Running automated Neo4j graph database seeding..."
cypher-shell -a bolt://neo4j:7687 -f /init-neo4j.cypher
