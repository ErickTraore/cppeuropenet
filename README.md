# CPPEUROPE.NET - Site Web PPA-CI

Site web de l'association CPPEUROPE.NET) avec gestion de presse, authentification et profils utilisateurs.

## 🏗️ Architecture

- **Frontend**: React 18 avec Redux
- **Backend**: 
  - `user-backend`: Gestion utilisateurs, messages, authentification (port 7001)
  - `media-backend`: Gestion des médias (images/vidéos) (port 7002)
- **Base de données**: MariaDB 11
- **Serveur web**: Nginx (reverse proxy)
- **Déploiement**: Docker Compose

## 🚀 Démarrage rapide

```bash
# Cloner le dépôt
git clone <url-du-repo>
cd lespremices

# Créer les fichiers .env nécessaires
# frontend/.env
REACT_APP_USER_API=http://localhost:7001/api
REACT_APP_MEDIA_API=http://localhost:7002/api
REACT_APP_BASE_URL=http://localhost:7002

# Lancer avec Docker
docker compose up -d

# Le site sera accessible sur http://localhost
```

## 📁 Structure du projet

```
lespremices/
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

## 📝 Migrations de base de données

```bash
# Exécuter les migrations user-backend
docker exec lespremices-user-backend-1 npx sequelize-cli db:migrate

# Exécuter les migrations media-backend
docker exec lespremices-media-backend-1 npx sequelize-cli db:migrate
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
DB_NAME=lespremices
JWT_SECRET=<secret>
```

### Media Backend
```
DB_HOST=mariadb
DB_USER=root
DB_PASSWORD=<password>
DB_NAME=lespremices_media
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
docker logs lespremices-user-backend-1
docker logs lespremices-media-backend-1
docker logs lespremices-nginx-1
```

### Base de données
```bash
docker exec -it lespremices-mariadb-1 mysql -u root -p
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
