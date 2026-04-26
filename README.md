Prerequis frontend:
- Toujours lancer les tests E2E via la commande `e2e:cold` du package frontend.
- Ne pas lancer directement des commandes Cypress isolees pour valider un run complet.
- Utiliser un fichier d'environnement dedie Cypress (`frontend/.env.cypress`) au lieu des `.env` React.

`e2e:cold` automatise: reset compose, relance de la stack, build frontend E2E, precheck, puis execution Cypress.

## Procedure Developpeur (Execution)

Objectif: executer les tests E2E de facon reproductible, rigoureuse et stable.

1. Verifier le dossier de travail (terminal)

```bash
cd /Users/traore/Documents/sites/sitesEnProductions.v1
pwd
ls
```

Verification attendue:
- `pwd` retourne `/Users/traore/Documents/sites/sitesEnProductions.v1`.
- `ls` affiche au minimum `contabo-cppeurope` et `hostinger-cppeurope`.

2. Reinitialiser les 2 VPS (option rigoureuse recommandee)

```bash
bash hostinger-cppeurope/scripts/e2e-reset-two-vps.sh
```

3. Lancer la campagne E2E complete (commande de reference)

```bash
npm --prefix hostinger-cppeurope/frontend run e2e:cold
```

Pour preparer le fichier d'environnement Cypress local (une seule fois):

```bash
cp hostinger-cppeurope/frontend/.env.cypress.example hostinger-cppeurope/frontend/.env.cypress
```

Pour staging (fichier dedie):

```bash
cp hostinger-cppeurope/frontend/.env.cypress.staging.example hostinger-cppeurope/frontend/.env.cypress.staging
CYPRESS_ENV_FILE=.env.cypress.staging npm --prefix hostinger-cppeurope/frontend run e2e:cold
```

Important pour staging:
- Renseigner `HOSTINGER_FRONTEND_BASE_PATH=/cppeurope-staging` dans le fichier Cypress staging.
- Avec ce prefixe, Cypress cible automatiquement `.../cppeurope-staging/api/...`.

4. Valider la stabilite (3 passes consecutives)

```bash
npm --prefix hostinger-cppeurope/frontend run e2e:new:stable
```

5. Accepter ou rejeter le run

Critere PASS:
- Chaque commande se termine avec un code de sortie `0`.
- Cypress termine avec `All specs passed`.
- Resultat final de stabilite: `ALL_GREEN`.

Critere FAIL:
- Un code de sortie non nul a n'importe quelle etape.
- Absence de `All specs passed` dans le run Cypress.

6. Procedure en cas d'echec

- Relancer d'abord l'etape 2 (reset), puis l'etape 3 (`e2e:cold`).
- Considerer le run invalide tant que la commande ne se termine pas avec code `0`.
- Corriger a partir de la premiere erreur deterministe, pas a partir des logs de progression Docker.


#############################################################################################################################################


# HOSTINGER-CPPEUROPE.NET - Site Web PPA-CI

Site web de l'association HOSTINGER-CPPEUROPE.NET avec gestion de presse, authentification et profils utilisateurs.

### Dépôts Git (à ne pas confondre)

| Dépôt | Rôle |
|-------|------|
| **[cppeuropenet](https://github.com/ErickTraore/cppeuropenet.git)** | Site principal : frontend, `user-backend`, nginx, Docker Compose Hostinger (`/var/www/cppeurope` sur le VPS site). **C’est ce dépôt-ci.** |
| **[contabo-cppeurope](https://github.com/ErickTraore/contabo-cppeurope.git)** | Backends du **2ᵉ VPS** (Contabo) : presse générale/locale, médias, profils médias, `home-config` côté Contabo, etc. (`/opt/contabo-cppeurope` sur le serveur Contabo). **Pas** le même code que le site Hostinger. |

## 🏗️ Architecture

- **Frontend**: React 18 avec Redux
- **Backend**: 
  - `user-backend`: Gestion utilisateurs, messages, authentification (port 7001)
  - `media-backend`: Gestion des médias (images/vidéos) (port 7002)
- **Base de données**: MariaDB 11
- **Serveur web**: Nginx (reverse proxy)
- **Déploiement**: Docker Compose

### Multi-VPS (Hostinger + Contabo)

L’application est **répartie sur au moins deux VPS** : le serveur « site » (souvent Hostinger, DNS `cppeurope.net`) et un **deuxième VPS Contabo** qui héberge presse générale/locale, APIs médias, profils médias et stockage fichiers. Le nginx du premier **proxy**e vers l’IP Contabo (`62.171.186.233`) pour ces chemins (voir `nginx/conf.d/cppeurope.conf`).

**Accès SSH Contabo (opérations)** — clés privées **hors dépôt**.

| | |
|--|--|
| IP | `62.171.186.233` |
| Utilisateur | `root` |
| Clé typique | `~/.ssh/id_ed25519` (surcharge possible via `CONTABO_SSH_KEY`) |
| Hostname | `vmi3028091` |

Raccourci : `./scripts/ssh-contabo.sh` (voir le script pour les variables d’environnement).

**Staging** (`docker-compose.staging.yml`) : MariaDB **séparée** sur le VPS principal. Les appels vers Contabo utilisent le **préfixe de chemin** `/cppeurope-staging` (nginx `nginx/staging/`, variable `CONTABO_PATH_PREFIX` côté `server.prod.js`, URLs dans `user-backend/.env.staging`).

**Contabo (2ᵉ VPS)** : toutes les APIs cppeurope ont des **backends staging** dédiés (ports loopback **17004–17007**, **17016**) et nginx route `/cppeurope-staging/…` vers eux — voir `deploy/CONTABO-VPS-STAGING.md`.

## 🚀 Démarrage rapide

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd hostinger-cppeurope

# Les fichiers `.env` / `.env.*` sont versionnés (staging) : après clone, les ajuster si besoin.

# Ports fixes pour Cypress / E2E (recommandé en local) :
npm run e2e:compose up -d
# (utilise docker-compose.e2e.env : front 8082, MariaDB 3314, nginx 8085, adminer 8083)

# Ou prod avec variables dans docker-compose.production.env :
./scripts/production-compose.sh up -d

# Front (build dans le conteneur) : http://localhost:8082
```

## 📁 Structure du projet

```
hostinger-cppeurope/
├── frontend/              # Application React
│   ├── src/
│   │   ├── actions/       # Redux actions
│   │   ├── reducers/      # Redux reducers
│   │   ├── components/    # Composants React
│   │   └── styles/        # SCSS styles
│   └── build/            # Build de production
├── user-backend/         # API utilisateurs & messages
│   ├── routes/           # Contrôleurs API
│   ├── models/           # Modèles Sequelize
│   └── migrations/       # Migrations DB
├── media-backend/        # API médias
│   ├── routes/           # Routes upload/download
│   ├── controllers/      # Logique métier
│   └── uploads/          # Stockage fichiers
├── nginx/                # Configuration Nginx
└── docker-compose.yml    # Orchestration Docker
```

## 🔑 Fonctionnalités

### Authentification
- Inscription / Connexion
- JWT avec access token (1 min) et refresh token (30 min)
- Timer de session visible dans le header
- Middleware de protection des routes

### Gestion de presse
- Création d'articles avec texte, images et vidéos
- Catégorisation (presse, nécrologie, etc.)
- Player vidéo personnalisé avec contrôles avancés
- Affichage responsive des médias

### Profils utilisateurs
- Page profil avec informations personnelles
- Upload d'avatar
- Historique des messages

### Administration
- Interface CRUD pour les messages
- Gestion des médias (remplacement d'images/vidéos)
- Modération du contenu

## 🛠️ Technologies

### Frontend
- React 18
- Redux (state management)
- React Router v6
- Axios
- SCSS
- Font Awesome

### Backend
- Node.js 20
- Express
- Sequelize ORM
- JWT (jsonwebtoken)
- Multer (upload fichiers)
- bcrypt (hash mots de passe)

### Base de données
- MariaDB 11
- Migrations Sequelize

### DevOps
- Docker & Docker Compose
- Nginx
- Scripts de démarrage avec wait-for-db

## ✅ Release Gates (officiel)

Le flux standard est:

1. local
2. staging
3. production smoke

Script unique:

```bash
./scripts/release-check.sh [local|staging|prod-smoke|ci-smoke|all]
```

Exemples:

```bash
# Gate local (build + smoke auth)
./scripts/release-check.sh local

# Gate staging (suite E2E complete)
./scripts/release-check.sh staging

# Gate smoke production (domaine public autorise)
./scripts/release-check.sh prod-smoke

# Pipeline complet
./scripts/release-check.sh all
```

Documentation associee:

- `deploy/RELEASE_RUNBOOK.md`
- `deploy/GO_NO_GO.md`
- `deploy/ENVIRONMENT_MATRIX.md`
- `deploy/INCIDENT_RUNBOOK.md`
- `deploy/ROLLBACK.md`

## 📝 Migrations de base de données

```bash
# Exécuter les migrations user-backend
docker exec hostinger-cppeurope-user-backend-1 npx sequelize-cli db:migrate

# Exécuter les migrations media-backend
docker exec hostinger-cppeurope-media-backend-1 npx sequelize-cli db:migrate
```

## 🔧 Développement

### Frontend
```bash
cd frontend
npm install
npm start  # Dev server sur port 3000
npm run build  # Build de production
```

### Backend
```bash
cd user-backend
npm install
npm run dev  # Serveur de développement
```

## 🌐 Variables d'environnement

### Frontend (.env)
```
REACT_APP_USER_API=<url-user-backend>
REACT_APP_MEDIA_API=<url-media-backend>
REACT_APP_BASE_URL=<url-base-media>
```

### User Backend
```
DB_HOST=mariadb
DB_USER=root
DB_PASSWORD=<password>
DB_NAME=hostinger-cppeurope
JWT_SECRET=<secret>
```

### Media Backend
```
DB_HOST=mariadb
DB_USER=root
DB_PASSWORD=<password>
DB_NAME=hostinger-cppeurope_media
```

## 📦 Dépendances principales

### Frontend
- react: ^18.x
- react-redux: ^8.x
- react-router-dom: ^6.x
- axios: ^1.x

### Backend
- express: ^4.x
- sequelize: ^6.x
- jsonwebtoken: ^9.x
- bcrypt: ^5.x
- multer: ^1.x

## 🐛 Debug

### Logs Docker
```bash
docker logs hostinger-cppeurope-user-backend-1
docker logs hostinger-cppeurope-media-backend-1
docker logs hostinger-cppeurope-nginx-1
```

### Base de données
```bash
docker exec -it hostinger-cppeurope-mariadb-1 mysql -u root -p
```

## ⚠️ Précautions à prendre pour une copie

Lors de la duplication d'un projet vers un nouveau serveur, suivre ces étapes pour éviter les problèmes :

### **Actions à exiger lors d'une copie totale** :

#### 1. **Demander un diff systématique AVANT validation** ✅
```bash
"Fais un diff entre les deux configurations nginx/docker-compose/etc. 
et explique-moi CHAQUE différence"
```
→ Cela oblige à comparer ligne par ligne

#### 2. **Exiger une documentation des adaptations** 📝
```
"Liste TOUTES les modifications que tu as faites par rapport à l'original"
```
→ Distinguer :
- Changements **intentionnels** (ports, domaines)
- Changements **accidentels** (paths manquants, configurations incomplètes)

#### 3. **Demander une validation par tests** 🧪
```
"Teste que l'API fonctionne exactement comme sur le serveur source"
```
→ Vérifier AVANT de considérer la copie terminée

#### 4. **Exiger la preuve de conformité** 🔍
```
"Montre-moi que les deux nginx.conf sont identiques 
(à l'exception des ports et domaines)"
```

### **Commande concrète recommandée** :

> *"Copie [source] vers [destination]. Avant de valider, fais un diff de tous les fichiers de config et montre-moi les différences. Justifie chaque ligne qui diffère."*

### **Points critiques à vérifier** :
- Configuration Nginx : `proxy_pass` avec chemins API complets
- Variables d'environnement (.env) : URLs, ports, credentials
- Docker Compose : ports, volumes, noms de conteneurs
- Base de données : structure ET données
- Fichiers uploads : copie complète avec permissions
- Code spécifique : localStorage keys, JWT secrets, chemins API

**Principe** : Ne pas faire confiance aveuglément. **Exiger la preuve** que la copie est conforme.

---

## 📄 Licence

Projet propriétaire - PPA-CI © 2026

## 👥 Contact

Association Les Premices (PPA-CI)

---

## Récap pour Cursor — VPS Hostinger / cppeurope

À coller en début de session Cursor sur le VPS (ou pour aligner un assistant sur le contexte prod / CD).

**Dépôt GitHub :** `ErickTraore/cppeuropenet` (frontend + user-backend + nginx + Docker dans le même repo).

**Sur le VPS :**

- Clone du site : **`/var/www/cppeurope`** (valeur type de `DEPLOY_PATH` pour le CD).
- Stack : **`docker compose`** depuis ce dossier (`docker-compose.yml` à la racine du repo).

**Point d’attention Docker :** le service `presse-generale-backend` monte le code et l’env depuis **`../contabo-cppeurope/presseGenerale-backend`** → sur le VPS il faut **`/var/www/contabo-cppeurope/presseGenerale-backend`** et un **`.env.production`** présent dans le clone (versionné avec le dépôt `contabo-cppeurope`). Sans ce fichier au bon chemin, **`docker compose up`** peut échouer (*env file … not found*).

**CI (GitHub) :** push sur `main` / `master` / `develop` → workflow **CI** : build frontend + smoke Cypress `cypress/e2e/new/027_cppeuropeNet.cy.js`. Voir aussi `CI_CD_SETUP.md`.

**CD (GitHub) :** workflow **Deploy** (`cd.yml`) — **manuel** (`workflow_dispatch`), confirmation **`DEPLOY`**, branche **`main`**. Sur le VPS : `git fetch` + `git reset --hard origin/<git_ref>` + **`./deploy-with-tests.sh`** (Jest + `npm run build` dans `frontend/`) + `docker compose down` + `docker compose up -d --build`. Secrets : `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`, `DEPLOY_SSH_KEY` (repo et/ou environnement **`production`** selon la config GitHub). Un échec fréquent : étape **`ssh-keyscan`** si `DEPLOY_HOST` est vide ou mal placé.

**Déploiement manuel :** même séquence que le CD sans passer par GitHub ; après `git clone` / `git pull`, vérifier que les **`.env.*` versionnés** dans `contabo-cppeurope/…` sont bien présents sur le disque du VPS avant **`docker compose up`**.

**Objectifs typiques :** (1) secrets GitHub (`DEPLOY_HOST`, etc.) pour que **Deploy** passe l’étape SSH ; (2) arborescence Contabo alignée avec le dépôt pour que **`docker compose up`** trouve les **fichiers d’environnement** attendus.

