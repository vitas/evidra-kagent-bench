#!/bin/sh
set -eu

# Wait for the bench_runs table to exist (evidra-api creates it via migrations).
echo "waiting for schema migrations..."
attempt=0
until psql "$DATABASE_URL" -c "SELECT 1 FROM bench_runs LIMIT 0" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 60 ]; then
    echo "schema not ready after 60s" >&2
    exit 1
  fi
  sleep 1
done
echo "schema ready, seeding demo data..."

psql "$DATABASE_URL" -f /seed/seed-data.sql

echo "seed complete"
