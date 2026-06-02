#!/usr/bin/env bash
# scripts/generate-local-certs.sh
# Génère des certificats SSL auto-signés pour l'environnement E2E local.
# À exécuter une fois après git clone, avant de lancer docker compose E2E.
#
# Usage: bash scripts/generate-local-certs.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CERTS_DIR="${REPO_ROOT}/nginx/certs"
LETSENCRYPT_MOCK="${CERTS_DIR}/letsencrypt/live/cppeurope.net"

echo "[certs] Répertoire cible: ${LETSENCRYPT_MOCK}"
mkdir -p "${LETSENCRYPT_MOCK}"

if [[ -f "${LETSENCRYPT_MOCK}/fullchain.pem" && -f "${LETSENCRYPT_MOCK}/privkey.pem" ]]; then
  echo "[certs] Certificats déjà présents. Supprimez-les manuellement pour les régénérer."
  echo "  ${LETSENCRYPT_MOCK}/fullchain.pem"
  echo "  ${LETSENCRYPT_MOCK}/privkey.pem"
  exit 0
fi

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
  -keyout "${LETSENCRYPT_MOCK}/privkey.pem" \
  -out "${LETSENCRYPT_MOCK}/fullchain.pem" \
  -subj "/CN=localhost" 2>&1

echo "[ok] Certificats auto-signés générés (valides 10 ans) :"
echo "  ${LETSENCRYPT_MOCK}/fullchain.pem"
echo "  ${LETSENCRYPT_MOCK}/privkey.pem"
echo ""
echo "IMPORTANT: Ces fichiers sont ignorés par .gitignore — ne jamais les committer."
echo "Pour démarrer nginx E2E : docker compose --env-file docker-compose.e2e.env up -d nginx"
