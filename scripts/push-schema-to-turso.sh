#!/usr/bin/env bash
# Apply Prisma migrations to a Turso database.
# Usage: TURSO_DB=union-yoga-frame ./scripts/push-schema-to-turso.sh
set -euo pipefail
DB="${TURSO_DB:-union-yoga-frame}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for f in "$ROOT"/prisma/migrations/*/migration.sql; do
  echo "Applying $(basename "$(dirname "$f")")..."
  turso db shell "$DB" < "$f"
done
echo "Done."
