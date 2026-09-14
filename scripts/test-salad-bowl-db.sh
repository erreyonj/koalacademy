#!/usr/bin/env bash
# Run the Salad Bowl database test suite against the local Supabase stack.
# Requires Docker. Applies all migrations fresh, then runs the SQL assertions
# (which roll themselves back).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running — start Docker Desktop first." >&2
  exit 1
fi

npx supabase start
npx supabase db reset --local

DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/salad_bowl_test.sql

echo "OK: all Salad Bowl database tests passed."
