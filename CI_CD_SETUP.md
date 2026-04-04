# CI/CD setup (GitHub Actions)

## Workflows

- CI: `.github/workflows/ci.yml`
  - Build frontend React sur push/PR
  - Exécute un smoke test Cypress (`hostingerCppeuropeNet.cy.js`)

- CD: `.github/workflows/cd.yml`
  - Déclenchement automatique sur push `main`
  - Déclenchement manuel (`workflow_dispatch`)
  - Déploiement SSH sur VPS
  - Option `run_e2e=true|false` pour inclure/ignorer les E2E pendant le déploiement

## Secrets GitHub requis

Configurer ces secrets dans le repo GitHub (`Settings > Secrets and variables > Actions`) :

- `DEPLOY_HOST` : IP ou domaine du serveur
- `DEPLOY_USER` : utilisateur SSH (ex: `root`)
- `DEPLOY_PATH` : chemin du projet sur serveur (ex: `/var/www/hostinger-cppeurope`)
- `DEPLOY_SSH_KEY` : clé privée SSH (format OpenSSH)

## Utilisation

### Pré-merge local (recommandé)

Depuis le dossier `frontend`, exécuter avant toute PR :

- `npm run premerge:check:with-refresh`

Ce script enchaîne automatiquement :

- refresh Browserslist (`caniuse-lite`)
- build frontend React
- E2E ciblé `profilePageImagesAvatars.cy.js` sur `http://localhost:3000`
- E2E ciblé `profilePageImagesAvatars.cy.js` sur `http://localhost:8082`

### CI
- Automatique à chaque push et pull request sur `main`, `master`, `develop`.

### CD
#### Automatique
- Chaque push sur `main` déclenche un déploiement avec `run_e2e=false`.

#### Manuel
1. Aller dans `Actions > CD > Run workflow`
2. Choisir `run_e2e` :
   - `false` = déploiement rapide (E2E ignorés)
   - `true` = déploiement avec `deploy-with-tests.sh` complet
3. Lancer le workflow

## Notes

- Le job CI exécute un smoke E2E léger en local CI (`http://localhost:3000`).
- Le run E2E complet (24 specs) reste recommandé sur ton environnement Docker local/staging.
