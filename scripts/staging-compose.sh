#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
BACKEND_ENV="$ROOT/user-backend/.env.staging"
COMPOSE_ENV="$ROOT/docker-compose.staging.env"
if [[ ! -f "$BACKEND_ENV" ]]; then
  echo "Fichier manquant : $BACKEND_ENV" >&2
  echo "Copiez user-backend/.env.staging.example vers user-backend/.env.staging puis éditez (ALLOWED_ORIGINS, mots de passe, JWT)." >&2
  exit 1
fi
if [[ ! -f "$COMPOSE_ENV" ]]; then
  echo "Fichier manquant : $COMPOSE_ENV" >&2
  echo "Copiez docker-compose.staging.env.example vers docker-compose.staging.env puis éditez (ports, préfixe Contabo, proxy)." >&2
  exit 1
fi
exec docker compose --env-file "$BACKEND_ENV" --env-file "$COMPOSE_ENV" -f docker-compose.staging.yml -p cppeurope-staging "$@"
