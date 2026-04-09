# Rollback Procedure

Procedure standard pour revenir vite a un etat stable.

## 1) Conditions de depart

- Commit stable connu (SHA ou tag).
- Fenetre de rollback validee.
- Operateur connecte au VPS principal.

## 2) Rollback application (Hostinger)

```bash
cd /var/www/cppeurope
git fetch origin
git reset --hard <commit_stable>
./deploy-with-tests.sh
docker compose down
docker compose up -d --build
docker compose ps
```

## 3) Verification post-rollback

```bash
cd /var/www/cppeurope/frontend
npm run cypress:run:new -- --config baseUrl=https://cppeurope.net --spec "cypress/e2e/new/006_initUsersE2E.cy.js,cypress/e2e/new/009_loginFormE2E.cy.js"
```

Checks manuels:
- home visible
- login admin/user OK
- endpoint `/api/home-config` OK

## 4) Si incident lie a Contabo

Verifier/retablir les variables et configs specifiques:

- `PRESSE_BASE_URL` dans `/opt/contabo-cppeurope/mediaGle-backend/.env.staging`
- snippet nginx staging prefixe

Redemarrage cible (exemple media staging):

```bash
./scripts/ssh-contabo.sh "cd /opt/contabo-cppeurope/mediaGle-backend && docker compose --env-file .env.compose-staging -f docker-compose.staging.yml -p media-staging-gle up -d --force-recreate mediaGle-backend"
```

## 5) Communication

Documenter dans le journal:
- cause pressee
- commit rollback
- heure debut/fin
- resultat smoke post-rollback

