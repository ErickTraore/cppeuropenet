#!/usr/bin/env bash
set -euo pipefail

# Release gates runner:
# - local: build + smoke auth
# - staging: deterministic critical cypress smoke on staging (override with STAGING_CYPRESS_SPEC for full suite)
# - prod-smoke: minimal smoke on production domain
# - ci-smoke: smoke rapide UI pour GitHub CI
# - all: local -> staging -> prod-smoke

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT/frontend"

MODE="${1:-all}"
STAGING_BASE_URL="${STAGING_BASE_URL:-https://staging.cppeurope.net}"
PROD_BASE_URL="${PROD_BASE_URL:-https://www.cppeurope.net}"
STAGING_HOME_CONFIG_ORIGIN="${STAGING_HOME_CONFIG_ORIGIN:-$STAGING_BASE_URL}"
SMOKE_USER_EMAIL="${SMOKE_USER_EMAIL:-healthcheck@cppeurope.net}"
SMOKE_USER_PASSWORD="${SMOKE_USER_PASSWORD:-healthcheck2026}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_local() {
  log "Gate local: build + smoke auth"
  cd "$FRONTEND_DIR"
  npm run build
  env -u ELECTRON_RUN_AS_NODE BROWSERSLIST_IGNORE_OLD_DATA=1 \
    npx cypress run \
      --config-file cypress.config.cjs \
      --config "baseUrl=${PROD_BASE_URL}" \
      --spec "cypress/e2e/new/new-0-start/006_initUsersE2E.cy.js,cypress/e2e/new/new-0-start/009_loginFormE2E.cy.js"
}

run_staging() {
  log "Gate staging: critical E2E smoke (${STAGING_BASE_URL})"
  cd "$FRONTEND_DIR"

  local default_staging_specs="cypress/e2e/new/new-0-start/006_initUsersE2E.cy.js,cypress/e2e/new/new-0-start/007_initUsersE2E_2.cy.js,cypress/e2e/new/new-0-start/009_loginFormE2E.cy.js,cypress/e2e/new/new-9/027_cppeuropeNet.cy.js,cypress/e2e/new/new-9/031_sessionInvalidationReload.cy.js,cypress/e2e/new/new-9/032_usersAdmin2026User2026.cy.js,cypress/e2e/new/new-10/033_presseGeneralePhotoKeepsShell.cy.js,cypress/e2e/new/new-10/034_presseGeneraleConsultAfterCreateOption1.cy.js,cypress/e2e/new/new-10/035_presseGeneraleConsultAfterCreateOption2.cy.js,cypress/e2e/new/new-10/036_presseGeneraleConsultAfterCreateOption3.cy.js,cypress/e2e/new/new-10/037_presseGeneraleConsultAfterCreateOption4.cy.js,cypress/e2e/new/new-11/044_homePageVisitorFlow.cy.js"
  local staging_specs="${STAGING_CYPRESS_SPEC:-$default_staging_specs}"

  log "Attente frontend staging (${STAGING_BASE_URL}) avant Cypress"
  local code="000"
  local attempts=40
  local i
  for ((i=1; i<=attempts; i++)); do
    code="$(curl -sS -o /tmp/staging-smoke-home.txt -w "%{http_code}" \
      "${STAGING_BASE_URL}" || true)"

    if [[ "$code" == "200" || "$code" == "301" || "$code" == "302" ]]; then
      log "Frontend staging prêt (HTTP ${code})"
      break
    fi

    if [[ "$i" -eq "$attempts" ]]; then
      log "Frontend staging indisponible après ${attempts} tentatives (dernier code: ${code})"
      head -c 300 /tmp/staging-smoke-home.txt || true
      return 1
    fi

    sleep 5
  done

  npm run e2e:ensure-build
  env -u ELECTRON_RUN_AS_NODE BROWSERSLIST_IGNORE_OLD_DATA=1 \
    CYPRESS_E2E_PROFILE=staging \
    CYPRESS_SKIP_E2E_INFRA_GATE=1 \
    npx cypress run \
      --config-file cypress.config.cjs \
      --config "baseUrl=${STAGING_BASE_URL}" \
      --env "SKIP_E2E_READY_CHECKS=1,SKIP_E2E_INFRA_GATE=1,E2E_PROFILE=staging,HOME_CONFIG_ORIGIN=${STAGING_HOME_CONFIG_ORIGIN}" \
      --spec "${staging_specs}"
}

run_parity_gate() {
  if [[ "${SKIP_PARITY_GATE:-0}" == "1" ]]; then
    log "Gate parity: SKIPPED (SKIP_PARITY_GATE=1 — clés SSH serveurs staging/prod non disponibles en CI)"
    return 0
  fi
  log "Gate parity: staging vs production (mandatory before prod promotion)"
  cd "$ROOT"
  ./scripts/env-parity-check.sh
}

run_prod_smoke() {
  log "Gate prod-smoke: critical auth smoke (${PROD_BASE_URL})"
  cd "$FRONTEND_DIR"

  log "Attente API users (${PROD_BASE_URL}/api/users/login) avant Cypress"
  local code="000"
  local attempts=40
  local i
  for ((i=1; i<=attempts; i++)); do
    code="$(curl -sS -o /tmp/prod-smoke-users-login.txt -w "%{http_code}" \
      -H "Content-Type: application/json" \
      -X POST "${PROD_BASE_URL}/api/users/login" \
      -d "{\"email\":\"${SMOKE_USER_EMAIL}\",\"password\":\"${SMOKE_USER_PASSWORD}\"}" || true)"

    if [[ "$code" != "502" && "$code" != "000" ]]; then
      log "API users prête (HTTP ${code})"
      break
    fi

    if [[ "$i" -eq "$attempts" ]]; then
      log "API users indisponible après ${attempts} tentatives (dernier code: ${code})"
      head -c 300 /tmp/prod-smoke-users-login.txt || true
      return 1
    fi

    sleep 5
  done

  env -u ELECTRON_RUN_AS_NODE BROWSERSLIST_IGNORE_OLD_DATA=1 \
    CYPRESS_E2E_PROFILE=staging \
    npx cypress run \
      --config-file cypress.config.cjs \
      --config "baseUrl=${PROD_BASE_URL}" \
      --spec "cypress/e2e/new/new-0-start/006_initUsersE2E.cy.js,cypress/e2e/new/new-0-start/009_loginFormE2E.cy.js"
}

run_ci_e2e_full() {
  log "Gate ci-e2e-full: CRA server + ALL cypress/e2e/new specs"
  cd "$FRONTEND_DIR"
  npm ci
  npm start &
  npx wait-on http://localhost:3000
  env -u ELECTRON_RUN_AS_NODE npx cypress run \
    --config-file cypress.config.cjs \
    --config baseUrl=http://localhost:3000 \
    --spec "cypress/e2e/new/**/*.cy.js"
}

run_ci_smoke() {
  log "Gate ci-smoke: CRA server + single public-shell smoke"
  cd "$FRONTEND_DIR"
  npm ci
  npm start &
  npx wait-on http://localhost:3000
  env -u ELECTRON_RUN_AS_NODE \
    CYPRESS_SKIP_E2E_INFRA_GATE=1 \
    npx cypress run \
      --config-file cypress.config.cjs \
      --config baseUrl=http://localhost:3000 \
      --env "SKIP_E2E_INFRA_GATE=1,SKIP_E2E_READY_CHECKS=1" \
      --spec "cypress/e2e/new/new-9/027_cppeuropeNet.cy.js"
}

usage() {
  cat <<'EOF'
Usage:
  ./scripts/release-check.sh [local|staging|prod-smoke|ci-smoke|ci-e2e-full|all]

Environment overrides:
  STAGING_BASE_URL=https://staging.cppeurope.net
  PROD_BASE_URL=https://www.cppeurope.net
EOF
}

case "$MODE" in
  local)
    run_local
    ;;
  staging)
    run_staging
    ;;
  prod-smoke)
    run_parity_gate
    run_prod_smoke
    ;;
  ci-smoke)
    run_ci_smoke
    ;;
  ci-e2e-full)
    run_ci_e2e_full
    ;;
  all)
    run_local
    run_staging
    run_parity_gate
    run_prod_smoke
    ;;
  -h|--help|help)
    usage
    exit 0
    ;;
  *)
    usage
    exit 2
    ;;
esac

log "Release gates: OK (${MODE})"

