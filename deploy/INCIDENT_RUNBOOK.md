# Runbook Incident (Ops)

Ce document sert pendant un incident pour diagnostiquer vite et agir sans improviser.

## 1) Triage en 5 minutes

1. Identifier l'environnement touche:
   - local / staging / production
2. Identifier le symptome principal:
   - site inaccessible
   - login KO
   - upload media KO
   - home KO
3. Recuperer les preuves:
   - heure precise
   - endpoint en erreur
   - code HTTP
   - logs service associe

## 2) Commandes diagnostic rapides

Depuis `/var/www/cppeurope`:

```bash
# Etat stack prod hostinger
./scripts/production-compose.sh ps

# Logs principaux prod hostinger
./scripts/production-compose.sh logs --tail=120 nginx
./scripts/production-compose.sh logs --tail=120 user-backend
./scripts/production-compose.sh logs --tail=120 frontend
./scripts/production-compose.sh logs --tail=120 home-config
```

Staging:

```bash
./scripts/staging-compose.sh ps
./scripts/staging-compose.sh logs --tail=120 nginx
./scripts/staging-compose.sh logs --tail=120 user-backend
./scripts/staging-compose.sh logs --tail=120 frontend
./scripts/staging-compose.sh logs --tail=120 home-config
```

Contabo:

```bash
./scripts/ssh-contabo.sh "docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'staging|media|presse'"
```

## 3) Pannes frequentes et actions

### 3.1 Login UI en 403 (CORS)

Symptome:
- `POST /api/users/login` en 403 depuis navigateur/Cypress.

Action:
- verifier `ALLOWED_ORIGINS` de l'environnement cible.
- verifier l'origine reelle du navigateur (scheme + host + port).
- relancer `user-backend` si variable modifiee.

### 3.2 Upload image/video en 503 (format article indisponible)

Symptome:
- erreur: "Impossible de verifier le format de l'article..."

Action:
- verifier `PRESSE_BASE_URL` sur Contabo media backend cible.
- verifier routage nginx prefixe staging.
- tester endpoint format depuis le conteneur media.

### 3.3 Home regressions

Symptome:
- `/api/home-config` KO ou categories absentes.

Action:
- verifier service `home-config` + volume data.
- ne pas lancer de reset data incluant Home.

## 4) Evidence minimale a conserver

- Capture de la commande et sortie.
- Timestamp UTC/local.
- Commit SHA deploye.
- Service impacte.
- Action corrective appliquee.

## 5) Escalade

Escalader immediatement si:
- erreur 5xx persistante > 10 min
- login KO global
- endpoint home KO en production
- rollback necessaire

