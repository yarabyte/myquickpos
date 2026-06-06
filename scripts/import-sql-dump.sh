#!/usr/bin/env bash
# Import a PostgreSQL dump into Supabase (or any Postgres).
#
# Usage:
#   DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres" \
#     ./scripts/import-sql-dump.sh /path/to/myqucikpos.sql
#
# Use the DIRECT connection (port 5432), not the transaction pooler (6543).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

SQL_FILE="${1:-/Users/shakemill/Desktop/myqucikpos.sql}"
DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [[ -z "$DB_URL" ]]; then
  echo "Erreur: définissez DIRECT_URL (recommandé) ou DATABASE_URL."
  echo "Exemple Supabase (connexion directe):"
  echo '  DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require"'
  exit 1
fi

if [[ ! -f "$SQL_FILE" ]]; then
  echo "Erreur: fichier SQL introuvable: $SQL_FILE"
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "Erreur: psql n'est pas installé. Installez PostgreSQL client (brew install libpq)."
  exit 1
fi

echo "→ Import de $(basename "$SQL_FILE") ($(wc -c < "$SQL_FILE" | tr -d ' ') octets)…"
echo "→ Cible: ${DB_URL%%@*}@***"

RESET_SQL="$ROOT_DIR/scripts/reset-public-schema.sql"
if [[ -f "$RESET_SQL" ]]; then
  echo "→ Réinitialisation du schéma public (re-import)…"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$RESET_SQL"
fi

echo "→ Import des données (1–2 minutes)…"

psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$SQL_FILE"

echo "✓ Import terminé. Vérifiez avec: pnpm run db:studio"
