#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/docker-compose.production.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier manquant : $ENV_FILE" >&2
  echo "Copiez docker-compose.production.env.example vers docker-compose.production.env puis éditez (ports, MariaDB, CORS, proxy Contabo)." >&2
  exit 1
fi
exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml "$@"
