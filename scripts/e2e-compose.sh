#!/usr/bin/env bash
# Stack Ikoula avec ports FIGÉS pour Cypress (docker-compose.e2e.env).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ENV_FILE="$ROOT/docker-compose.e2e.env"
COMPOSE_TIMEOUT_SECONDS="${E2E_COMPOSE_DOWN_TIMEOUT_SECONDS:-25}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier manquant : $ENV_FILE" >&2
  exit 1
fi
# Evite les erreurs type API v1.44 sur Docker Desktop recent.
unset DOCKER_API_VERSION
# Compose en mode non-interactif pour des logs stables (pas de spinner TTY).
export COMPOSE_ANSI=never

if [[ $# -gt 0 && "$1" == "down" ]]; then
  shift
  exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml down --timeout "$COMPOSE_TIMEOUT_SECONDS" "$@"
fi

if [[ $# -gt 1 && "$1" == "up" && "$2" == "-d" ]]; then
  shift 2
  exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml up -d --remove-orphans "$@"
fi

exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml "$@"
