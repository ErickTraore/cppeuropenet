#!/usr/bin/env bash
# Stack Hostinger avec ports FIGÉS pour Cypress (docker-compose.e2e.env).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/docker-compose.e2e.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier manquant : $ENV_FILE" >&2
  exit 1
fi
exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml "$@"
