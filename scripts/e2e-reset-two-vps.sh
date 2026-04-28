#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_root="$(cd "${script_dir}/../.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "[reset][error] docker n'est pas installe ou non disponible dans le PATH." >&2
  exit 1
fi

contabo_root="${workspace_root}/contabo-cppeurope"
hostinger_root="${workspace_root}/hostinger-cppeurope"

if [[ ! -d "${contabo_root}" ]]; then
  echo "[reset][error] Dossier introuvable: ${contabo_root}" >&2
  exit 1
fi

if [[ ! -f "${hostinger_root}/docker-compose.yml" ]]; then
  echo "[reset][error] Fichier introuvable: ${hostinger_root}/docker-compose.yml" >&2
  exit 1
fi

if [[ ! -f "${hostinger_root}/docker-compose.e2e.env" ]]; then
  echo "[reset][error] Fichier introuvable: ${hostinger_root}/docker-compose.e2e.env" >&2
  exit 1
fi

echo "[reset] workspace: ${workspace_root}"

for d in "${contabo_root}"/*; do
  [[ -d "${d}" ]] || continue

  if [[ -f "${d}/docker-compose.yml" ]]; then
    echo "[reset][down] ${d} (docker-compose.yml)"
    docker compose -f "${d}/docker-compose.yml" down --remove-orphans || true
  elif [[ -f "${d}/docker-compose.dev.yml" ]]; then
    echo "[reset][down] ${d} (docker-compose.dev.yml)"
    docker compose -f "${d}/docker-compose.dev.yml" down --remove-orphans || true
  fi
done

echo "[reset][down] ${hostinger_root} (docker-compose.yml + e2e env)"
docker compose --env-file "${hostinger_root}/docker-compose.e2e.env" -f "${hostinger_root}/docker-compose.yml" down --remove-orphans || true

echo "[reset] down complete"
