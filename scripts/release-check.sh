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
  npm run cypress:run:new -- --config "baseUrl=${STAGING_BASE_URL}"
}

run_prod_smoke() {
  log "Gate prod-smoke: critical auth smoke (${PROD_BASE_URL})"
  cd "$FRONTEND_DIR"
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
    run_prod_smoke
    ;;
  ci-smoke|ci-e2e-full)
    run_ci_e2e_full
    ;;
  all)
    run_local
    run_staging
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

