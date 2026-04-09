#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/docker-compose.development.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier manquant : $ENV_FILE" >&2
  echo "Copiez docker-compose.development.env.example vers docker-compose.development.env puis éditez (ports, MariaDB, URLs médias)." >&2
  exit 1
fi
exec docker compose --env-file "$ENV_FILE" -f docker-compose.dev.yml "$@"
