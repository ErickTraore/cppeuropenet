#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
workspace_root="$(cd "${script_dir}/../.." && pwd)"

if ! command -v docker >/dev/null 2>&1; then
  echo "[eteindre][error] docker n'est pas installe ou non disponible dans le PATH." >&2
  exit 1
fi

DOWN_TIMEOUT_SECONDS="${E2E_COMPOSE_DOWN_TIMEOUT_SECONDS:-25}"
export COMPOSE_ANSI=never

contabo_root="${workspace_root}/contabo-cppeurope"
ikoula_root="${workspace_root}/front-cppeurope"

if [[ ! -d "${contabo_root}" ]]; then
  echo "[eteindre][error] Dossier introuvable: ${contabo_root}" >&2
  exit 1
fi

if [[ ! -f "${ikoula_root}/docker-compose.yml" ]]; then
  echo "[eteindre][error] Fichier introuvable: ${ikoula_root}/docker-compose.yml" >&2
  exit 1
fi

if [[ ! -f "${ikoula_root}/docker-compose.e2e.env" ]]; then
  echo "[eteindre][error] Fichier introuvable: ${ikoula_root}/docker-compose.e2e.env" >&2
  exit 1
fi

echo "[eteindre] workspace: ${workspace_root}"

compose_down() {
  local dir="$1"
  local compose_file="$2"
  local env_file=""

  for candidate in \
    "${dir}/docker-compose.production.env" \
    "${dir}/docker-compose.production.env.example" \
    "${dir}/docker-compose.staging.env" \
    "${dir}/docker-compose.staging.env.example" \
    "${dir}/docker-compose.dev.env" \
    "${dir}/docker-compose.dev.env.example"
  do
    if [[ -f "${candidate}" ]]; then
      env_file="${candidate}"
      break
    fi
  done

  if [[ -n "${env_file}" ]]; then
    echo "[eteindre][env] $(basename "${env_file}")"
    docker compose --env-file "${env_file}" -f "${compose_file}" down --remove-orphans --timeout "${DOWN_TIMEOUT_SECONDS}" || true
  else
    docker compose -f "${compose_file}" down --remove-orphans --timeout "${DOWN_TIMEOUT_SECONDS}" || true
  fi
}

for d in "${contabo_root}"/*; do
  [[ -d "${d}" ]] || continue

  if [[ -f "${d}/docker-compose.yml" ]]; then
    echo "[eteindre][down] ${d} (docker-compose.yml)"
    compose_down "${d}" "${d}/docker-compose.yml"
  elif [[ -f "${d}/docker-compose.dev.yml" ]]; then
    echo "[eteindre][down] ${d} (docker-compose.dev.yml)"
    compose_down "${d}" "${d}/docker-compose.dev.yml"
  fi
done

echo "[eteindre][down] ${ikoula_root} (docker-compose.yml + e2e env)"
docker compose --env-file "${ikoula_root}/docker-compose.e2e.env" -f "${ikoula_root}/docker-compose.yml" down --remove-orphans --timeout "${DOWN_TIMEOUT_SECONDS}" || true

echo "[eteindre] down complete"
