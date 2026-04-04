#!/bin/bash
# ===============================
# ATTENTION :
# Merci de VALIDER ce script avant exécution.
# Vérifie que le contenu te convient, puis exécute-le manuellement.
# ===============================

# Vérification des services Docker Compose
cd "$(dirname "$0")"
echo "\n--- Statut des services Docker Compose ---"
docker compose ps

# Vérification de l'accessibilité HTTP du site et de l'API
SITE_URL="https://hostinger-cppeurope.net"
API_URL="https://hostinger-cppeurope.net/api"

echo "\n--- Test HTTP du site principal ---"
curl -I --max-time 10 "$SITE_URL"

echo "\n--- Test HTTP de l'API ---"
curl -I --max-time 10 "$API_URL"

echo "\nVérification terminée. Analyse les résultats ci-dessus."
