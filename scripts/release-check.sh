#!/usr/bin/env bash
set -euo pipefail

# Release gates runner:
# - local: build + smoke auth
# - staging: full cypress suite on staging
# - prod-smoke: minimal smoke on production domain
# - ci-smoke: smoke rapide UI pour GitHub CI
# - all: local -> staging -> prod-smoke

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$ROOT/frontend"

MODE="${1:-all}"
STAGING_BASE_URL="${STAGING_BASE_URL:-http://93.127.167.134:9085}"
PROD_BASE_URL="${PROD_BASE_URL:-https://cppeurope.net}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

run_local() {
  log "Gate local: build + smoke auth"
  cd "$FRONTEND_DIR"
  npm run build
  npm run cypress:run:new:smoke-auth -- --config "baseUrl=${PROD_BASE_URL}"
}

run_staging() {
  log "Gate staging: full E2E suite (${STAGING_BASE_URL})"
  cd "$FRONTEND_DIR"

  local staging_specs="${STAGING_CYPRESS_SPEC:-cypress/e2e/new/new-0-start/004_servicesInventory.cy.js,cypress/e2e/new/new-0-start/006_initUsersE2E.cy.js,cypress/e2e/new/new-0-start/007_initUsersE2E_2.cy.js,cypress/e2e/new/new-0-start/007_servicesStatus.cy.js,cypress/e2e/new/new-0-start/009_loginFormE2E.cy.js,cypress/e2e/new/new-11/042_homePageRendersAdminConfig.cy.js,cypress/e2e/new/new-11/044_homePageVisitorFlow.cy.js}"

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
    npx cypress run \
      --config-file cypress.config.cjs \
      --config "baseUrl=${STAGING_BASE_URL}" \
      --env "SKIP_E2E_READY_CHECKS=1,SKIP_E2E_INFRA_GATE=1,E2E_PROFILE=staging" \
      --spec "${staging_specs}"
}

run_parity_gate() {
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
      -d '{"email":"healthcheck@cppeurope.net","password":"healthcheck"}' || true)"

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

usage() {
  cat <<'EOF'
Usage:
  ./scripts/release-check.sh [local|staging|prod-smoke|ci-smoke|ci-e2e-full|all]

Environment overrides:
  STAGING_BASE_URL=http://93.127.167.134:9085
  PROD_BASE_URL=https://cppeurope.net
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
  ci-smoke|ci-e2e-full)
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

