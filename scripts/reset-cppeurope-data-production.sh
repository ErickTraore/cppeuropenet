#!/usr/bin/env bash
# Réinitialise les données CPPEurope (hors page Home) :
# - MariaDB Hostinger (Users, Profiles, Messages, …) — SequelizeMeta conservé
# - Contabo : presse générale (mémoire → restart), presse locale, médias, profils médias
# - Ne touche pas au volume SQLite home-config (hero + catégories + uploads Home)
#
# Usage depuis la racine du dépôt :
#   CONFIRM_RESET=yes ./scripts/reset-cppeurope-data-production.sh
#
# Prérequis : clé SSH vers le VPS Contabo (ex. ~/.ssh/id_ed25519), docker compose sur Hostinger.

set -euo pipefail

if [[ "${CONFIRM_RESET:-}" != "yes" ]]; then
  echo "Refus : définir CONFIRM_RESET=yes pour exécuter cette opération destructive."
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

CONTABO_HOST="${CONTABO_HOST:-62.171.186.233}"
SSH_OPTS=(-o BatchMode=yes -o StrictHostKeyChecking=accept-new)
if [[ -n "${CONTABO_SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "$CONTABO_SSH_KEY")
elif [[ -f "$HOME/.ssh/id_ed25519" ]]; then
  SSH_OPTS+=(-i "$HOME/.ssh/id_ed25519")
fi

echo "=== [1/2] MariaDB user-backend (Hostinger) ==="
./scripts/production-compose.sh exec -T user-backend env CONFIRM_RESET=yes node scripts/reset-mariadb-content.js

echo "=== [2/2] Contabo (${CONTABO_HOST}) : BDD + fichiers + restart presse générale ==="
ssh "${SSH_OPTS[@]}" "root@${CONTABO_HOST}" bash -s <<'REMOTE'
set -euo pipefail

truncate_db() {
  local container="$1"
  local user="$2"
  local pass="$3"
  local db="$4"
  shift 4
  local sql="SET FOREIGN_KEY_CHECKS=0;"
  for t in "$@"; do
    sql+=" TRUNCATE TABLE \`${t}\`;"
  done
  sql+=" SET FOREIGN_KEY_CHECKS=1;"
  docker exec "$container" mariadb -u"$user" --password="$pass" "$db" -e "$sql"
}

echo "-- Médias presse générale (media_prod_cppeurope_v1)"
truncate_db mediagle-backend-mariadb-1 c 'CppEurope@2025!' media_prod_cppeurope_v1 MediaPresseGle MediaProfile

echo "-- Presse locale (presse_locale_prod_cppeurope_v1)"
truncate_db presselocale-backend-mariadb-1 c 'CppEurope@2025!' presse_locale_prod_cppeurope_v1 PresseLocale

echo "-- Médias locale + médias profil (media_locale_prod_cppeurope_v1)"
truncate_db medialocale-backend-mariadb-1 c 'CppEurope@2025!' media_locale_prod_cppeurope_v1 MediaPresseGle MediaProfile

echo "-- Fichiers uploadés (répertoires conservés)"
for dir in \
  /opt/contabo-cppeurope/mediaGle-backend/uploads \
  /opt/contabo-cppeurope/mediaLocale-backend/uploads \
  /opt/contabo-cppeurope/userMediaProfile-backend/uploads
do
  if [[ -d "$dir" ]]; then
    find "$dir" -mindepth 1 -delete || true
    echo "   vidé : $dir"
  fi
done

echo "-- Presse générale : redémarrage (stockage mémoire → prochain id = 1)"
docker restart pressegenerale-backend-presse-generale-backend-1

echo "Contabo : terminé."
REMOTE

echo "=== Tout est terminé. La page Home (home-config) n'a pas été modifiée. ==="
