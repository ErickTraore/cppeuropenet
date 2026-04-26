#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT=8082
CMD="${1:-}"

# Ne libère le port 8082 que pour les commandes de démarrage.
if [[ "$CMD" == "up" || "$CMD" == "start" ]]; then
  PID=$(lsof -ti tcp:$PORT || true)
  if [ ! -z "$PID" ]; then
    echo "[INFO] Un processus occupe le port $PORT (PID: $PID). Il va être tué."
    kill $PID
    sleep 1
    if lsof -ti tcp:$PORT >/dev/null; then
      echo "[ERREUR] Impossible de libérer le port $PORT. Arrêtez manuellement le processus (PID: $PID)."
      exit 1
    else
      echo "[OK] Port $PORT libéré."
    fi
  else
    echo "[OK] Port $PORT déjà libre."
  fi
fi
ENV_FILE="$ROOT/docker-compose.production.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier manquant : $ENV_FILE" >&2
  echo "Copiez docker-compose.production.env.example vers docker-compose.production.env puis éditez (ports, MariaDB, CORS, proxy Contabo)." >&2
  exit 1
fi
exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml "$@"
