#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
FILE="$BACKUP_DIR/work-governor-${TIMESTAMP}.sql"

docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-work_governor}" \
  "${POSTGRES_DB:-work_governor}" > "$FILE"

echo "Backup written to $FILE"
