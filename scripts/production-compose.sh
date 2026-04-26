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
EXAMPLE_FILE="$ROOT/docker-compose.production.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Fichier manquant : $ENV_FILE" >&2
  echo "Copiez docker-compose.production.env.example vers docker-compose.production.env puis éditez (ports, MariaDB, CORS, proxy Contabo)." >&2
  exit 1
fi

# Vérifier que toutes les clés définies dans l'exemple sont présentes dans le .env de prod.
# L'exemple (.env.example) est la source de vérité versionnée : si une clé y est ajoutée
# et absente du .env de prod, le déploiement échoue avec un message explicite.
MISSING_KEYS=()
while IFS= read -r line; do
  # Ignorer les commentaires et lignes vides
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  [[ -z "${line// }" ]] && continue
  KEY="${line%%=*}"
  [[ -z "$KEY" ]] && continue
  if ! grep -qE "^${KEY}=" "$ENV_FILE"; then
    MISSING_KEYS+=("$KEY")
  fi
done < "$EXAMPLE_FILE"

if [[ ${#MISSING_KEYS[@]} -gt 0 ]]; then
  echo "[ERREUR] Clés manquantes dans docker-compose.production.env (présentes dans .example) :" >&2
  for k in "${MISSING_KEYS[@]}"; do
    echo "  - $k" >&2
  done
  echo "Ajoutez ces clés dans $ENV_FILE avant de relancer." >&2
  exit 1
fi

exec docker compose --env-file "$ENV_FILE" -f docker-compose.yml "$@"
