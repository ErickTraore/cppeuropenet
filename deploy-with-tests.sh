#!/usr/bin/env bash
# Validation frontend avant docker compose sur le VPS.
# Ne lance plus toute la suite Cypress ici : elle exige la stack Docker complète (presse, médias, etc.) —
# à exécuter en local avec : cd frontend && npm run cypress:run:new

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT/frontend"

export CI=true

echo "== hostinger-cppeurope : validation frontend =="
echo "   Répertoire : $ROOT/frontend"

echo ""
echo "— Jest (watchAll=false, passWithNoTests)"
npm test -- --watchAll=false --passWithNoTests

echo ""
echo "— Build production React"
npm run build

echo ""
echo "OK — build dans frontend/build ; enchaîner avec ./scripts/production-compose.sh up -d --build (docker-compose.production.env requis)."
