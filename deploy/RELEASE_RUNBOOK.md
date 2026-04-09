# Runbook Release CPPEurope

Ce runbook standardise le flux:

1. Developpement local
2. Validation staging
3. Deploiement production
4. Verification post-deploiement

Objectif: rendre les releases repetables, auditablees, et rollbackables.

Reference configuration:
- `deploy/ENVIRONMENT_MATRIX.md` (variables critiques et anti-drift)
- `deploy/INCIDENT_RUNBOOK.md` (diagnostic incident)
- `deploy/ROLLBACK.md` (rollback operationnel)

## 1) Preconditions

- Branche source propre et a jour.
- CI GitHub verte sur la branche cible.
- Acces SSH operationnels:
  - VPS principal (Hostinger)
  - VPS Contabo (services presse/media)
- Backups verifies avant toute release prod.

## 2) Etape Local (dev)

Sur la machine de dev:

```bash
cd /var/www/cppeurope
npm run -s test || true
cd frontend
npm run build
npm run cypress:run:new:smoke-auth
```

Critere de sortie:
- Build frontend OK
- Smoke auth OK

Alternative (gate automatique):

```bash
./scripts/release-check.sh local
```

## 3) Etape Staging

Depuis la racine du repo:

```bash
./scripts/staging-compose.sh up -d
cd frontend
npm run cypress:run:new -- --config baseUrl=http://93.127.167.134:9085
```

Critere de sortie:
- Suite E2E staging complete verte (ou exceptions explicitement validees et documentees).

Alternative (gate automatique):

```bash
./scripts/release-check.sh staging
```

## 4) Preparation Production

Checklist rapide avant deploiement:

- Changelog de release redige (meme court).
- Plan de rollback pret (commandes testeables).
- Fenetre de deploiement decidee.
- Personne responsable du go/no-go identifiee.

## 5) Deploiement Production

### Option A - GitHub Actions (recommande)

Workflow: `Deploy` (manuel), confirmation `DEPLOY`, ref `main`.

### Option B - Manuel VPS principal

```bash
cd /var/www/cppeurope
git fetch origin
git reset --hard origin/main
./deploy-with-tests.sh
./scripts/production-compose.sh down
./scripts/production-compose.sh up -d --build
```

> Attention: ne pas utiliser de force push sur `main`.

## 6) Verification Post-Deploy (prod)

Smoke minimum a executer:

- Login utilisateur/admin.
- Creation + suppression d'un article presse generale.
- Consultation presse locale.
- Verification Home (`/api/home-config`) sans regression.

Commande smoke ciblee:

```bash
cd /var/www/cppeurope/frontend
npm run cypress:run:new -- --config baseUrl=https://cppeurope.net --spec "cypress/e2e/new/006_initUsersE2E.cy.js,cypress/e2e/new/009_loginFormE2E.cy.js"
```

Critere de sortie:
- Smoke prod vert.

Alternative (gate automatique):

```bash
./scripts/release-check.sh prod-smoke
```

Execution complete des gates (local -> staging -> prod-smoke):

```bash
./scripts/release-check.sh all
```

## 7) Rollback (si incident)

1. Identifier le dernier commit stable.
2. Revenir a ce commit sur le VPS principal.
3. Redemarrer la stack.
4. Rejouer smoke minimal.

Exemple:

```bash
cd /var/www/cppeurope
git fetch origin
git reset --hard <commit_stable>
./scripts/production-compose.sh down
./scripts/production-compose.sh up -d --build
```

## 8) Journal de release (obligatoire)

Pour chaque release, noter:

- Date/heure
- Commit SHA
- Operateur
- Resultat staging
- Resultat smoke prod
- Incidents et actions correctives

