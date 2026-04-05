# CI/CD — guide pas à pas (hostinger-cppeurope)

Ce document te fait faire **CI** puis **CD** dans l’ordre, avec des mots simples.

---

## Avant toute chose : deux mots

- **CI (Intégration continue)**  
  Dès que tu envoies du code sur GitHub (`push` ou *pull request*), une machine **GitHub** compile le frontend et lance **un petit test** automatiquement.  
  **But** : attraper vite les erreurs de build ou la page d’accueil cassée, sans rien déployer en production.

- **CD (Déploiement)**  
  **Toi**, depuis le site GitHub, tu cliques pour dire : « mets le code du dépôt sur mon **VPS** et relance Docker ».  
  **But** : la production ne bouge **que quand tu le décides**, avec une confirmation écrite.

---

## Étape 1 — Avoir le code sur GitHub

1. Le dossier du projet doit être un dépôt Git (déjà le cas chez toi : `hostinger-cppeurope`).
2. Le dépôt distant doit être sur GitHub (URL du type `https://github.com/TON_COMPTE/hostinger-cppeurope`).

Si ce n’est pas encore poussé :

```bash
cd /chemin/vers/hostinger-cppeurope
git remote -v
git push -u origin main
```

*(Remplace `main` par ta branche principale si besoin.)*

---

## Étape 2 — Vérifier que les fichiers CI/CD sont bien dans le dépôt

Sur ton PC ou sur GitHub (onglet **Code**), tu dois voir au minimum :

- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml` (workflow affiché sous le nom **Deploy** dans l’interface)
- `deploy-with-tests.sh` à la **racine** du dépôt (à côté de `frontend/`, `docker-compose.yml`, etc.)

Si tu viens de les ajouter : `git add`, `git commit`, `git push`.

---

## Étape 3 — Premier test : seulement le CI (sans VPS)

1. Va sur GitHub → onglet **Actions**.
2. À gauche, clique sur **CI**.
3. Tu devrais voir un run déclenché par ton dernier `push`. Ouvre-le.
4. Attends la fin :
   - **vert** = le build + le petit test Cypress smoke sont OK ;
   - **rouge** = ouvre le job qui a échoué et lis les logs (souvent une erreur de build ou de test).

**À retenir** : tant que le CI est rouge, tu peux corriger le code et repousser ; **aucun déploiement** ne part tout seul.

---

## Étape 4 — Préparer le serveur (VPS)

Sur le VPS (connexion SSH comme d’habitude), il faut :

1. Un **clone Git** du même dépôt, par exemple :
   - `/var/www/hostinger-cppeurope`  
   *(le chemin exact sera recopié dans le secret `DEPLOY_PATH`.)*
2. À l’intérieur : `docker-compose.yml` (ou `docker compose`) qui lance le site comme aujourd’hui.
3. La branche que tu déploies (souvent `main`) doit exister sur `origin` après ton `git push`.

Test manuel utile (sur le VPS) :

```bash
cd /var/www/hostinger-cppeurope   # ou TON chemin
git status
bash ./deploy-with-tests.sh
docker compose up -d --build
```

Si ça marche à la main, le même enchaînement pourra être lancé par GitHub Actions.

---

## Étape 5 — Clé SSH pour que GitHub puisse se connecter au VPS

Sur **ton ordinateur** (ou sur le VPS, selon ta habitude) :

1. Si tu n’as pas encore de paire de clés dédiée au déploiement, tu peux en créer une :
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_deploy_hostinger -C "github-actions-deploy"
   ```
2. **Clé publique** (`github_deploy_hostinger.pub`) : à ajouter sur le VPS dans  
   `~/.ssh/authorized_keys` de l’utilisateur utilisé pour le déploiement (souvent `root` ou `deploy`).
3. **Clé privée** (`github_deploy_hostinger`, sans `.pub`) : c’est elle que tu vas coller **entièrement** dans le secret GitHub `DEPLOY_SSH_KEY` (voir étape 6).  
   **Ne la commite jamais dans le dépôt.**

Vérifie depuis ton PC :

```bash
ssh -i ~/.ssh/github_deploy_hostinger UTILISATEUR@IP_OU_DOMAINE_DU_VPS
```

Tu dois pouvoir te connecter sans mot de passe.

---

## Étape 6 — Configurer les secrets sur GitHub

1. Sur GitHub : dépôt **hostinger-cppeurope** → **Settings** → **Secrets and variables** → **Actions**.
2. Ajoute **Repository secrets** (ou secrets d’environnement **production** — voir note ci-dessous) :

| Nom du secret | Quoi mettre |
|----------------|-------------|
| `DEPLOY_HOST` | IP ou domaine du VPS (ex. `123.45.67.89` ou `monserveur.net`) |
| `DEPLOY_USER` | Utilisateur SSH (ex. `root` ou `ubuntu`) |
| `DEPLOY_PATH` | Chemin absolu du clone Git sur le VPS (ex. `/var/www/hostinger-cppeurope`) |
| `DEPLOY_SSH_KEY` | Contenu **complet** du fichier de **clé privée** (commence souvent par `-----BEGIN OPENSSH PRIVATE KEY-----`) |

**Note environnement `production`** : le workflow **Deploy** utilise `environment: production`.  
Si GitHub te demande de créer cet environnement, crée-le.  
Si tu mets des **Environment secrets** pour `production`, ils **remplacent** les secrets du dépôt pour ce workflow : dans ce cas, configure les **quatre** secrets dans **Settings → Environments → production** et pas seulement dans les secrets du repo.

---

## Étape 7 — Lancer un déploiement (CD) à la main

1. GitHub → **Actions**.
2. Dans la liste à gauche, choisis **Deploy** (fichier `cd.yml`).
3. Bouton **Run workflow** (en haut à droite).
4. Remplis :
   - **confirm** : tape exactement `DEPLOY` (tout en majuscules, sans espace en plus).
   - **git_ref** : en général `main` (ou la branche que tu veux sur le serveur).
5. **Run workflow**.

Ensuite, ouvre le run : tu dois voir les étapes SSH puis la fin en vert si tout va bien.

**Ce que fait le serveur dans l’ordre** :  
`git fetch` → `git reset --hard origin/<git_ref>` → `./deploy-with-tests.sh` (Jest + build frontend) → `docker compose down` → `docker compose up -d --build`.

---

## Étape 8 — Si quelque chose échoue

| Symptôme | Piste |
|----------|--------|
| CI rouge | Regarde le job **Frontend** ou **Cypress** ; corrige le code et repousse. |
| Deploy rouge à « Configurer la clé SSH » | Secret `DEPLOY_SSH_KEY` incomplet ou mauvais format. |
| Deploy rouge au moment du SSH | `DEPLOY_HOST`, `DEPLOY_USER`, ou clé / `authorized_keys` incorrects. |
| Échec sur `git reset` | Branche inexistante sur GitHub : vérifie `git_ref` et que tu as bien `git push` la branche. |
| Échec sur `deploy-with-tests.sh` | Connecte-toi au VPS, va dans `DEPLOY_PATH`, lance `bash ./deploy-with-tests.sh` et lis l’erreur (souvent build ou Jest). |
| Échec sur `docker compose` | Même chose en SSH : `docker compose` à la main depuis `DEPLOY_PATH`. |

---

## Rappel : ce que le CI ne fait pas

- Il ne lance **pas** toute la suite E2E (`cypress:run:new`) : elle demande toute ta stack Docker locale.
- Avant une grosse mise en prod, lance encore chez toi :

```bash
cd frontend
npm run cypress:run:new
```

---

## Fichiers techniques (référence)

- **CI** : `.github/workflows/ci.yml` — build + smoke `cypress/e2e/new/027_cppeuropeNet.cy.js`.
- **CD** : `.github/workflows/cd.yml` — workflow **Deploy**, manuel uniquement.
- **Script VPS** : `deploy-with-tests.sh` — Jest + `npm run build` dans `frontend/`, sans Cypress complet.

Les valeurs des secrets ne sont plus lisibles après enregistrement sur GitHub : garde une copie de la clé privée et des infos serveur dans un endroit sûr **hors** du dépôt.
