# Contabo (2ᵉ VPS) — variables Compose hors YAML

Oui : le même principe que sur le VPS principal s’applique ici.

- **Interpolation** `${…}` dans les `docker-compose*.yml` : lue uniquement depuis les fichiers passés à **`docker compose --env-file …`** (pas depuis les `env_file` des services).
- **Secrets / config applicative** (JWT, URLs, mots de passe BDD) : dans **`.env.staging`** ou **`.env.production`** au niveau du backend (comme aujourd’hui), **non versionnés** sur le serveur.
- **Ports, noms d’image, chemins de volumes exposés côté hôte, noms de projet Docker** : dans un fichier dédié **`docker-compose.staging.env`** (ou **`docker-compose.env`**) à la racine du répertoire du backend sur Contabo (ex. `/opt/contabo-cppeurope/mediaGle-backend/`). Versionner un **`.example`** sur le serveur ou recopier depuis ce dépôt (`deploy/contabo/examples/`).

## Convention recommandée

| Fichier sur le VPS (par backend) | Rôle |
|----------------------------------|------|
| `.env.staging` / `.env.production` | Variables lues par **Node** (secrets, Sequelize, `PRESSE_BASE_URL`, etc.) |
| `docker-compose.staging.env` | **Uniquement** ce qui sert à remplir `${…}` dans le YAML Compose |
| `docker-compose.staging.yml` | Aucun littéral de config (ports, tags d’image, chemins) : uniquement `${VAR}` |

Commande type (déjà utilisée pour mediaGle, voir `deploy/ROLLBACK.md`) :

```bash
cd /opt/contabo-cppeurope/mediaGle-backend
docker compose \
  --env-file ./docker-compose.staging.env \
  --env-file ./.env.staging \
  -f docker-compose.staging.yml \
  -p media-staging-gle \
  up -d
```

Ordre : d’abord l’env **Compose** (ports, interpolation), puis **`.env.staging`** si vous y mettez aussi des clés utilisées dans le YAML (sinon un seul `--env-file` suffit). **Le dernier fichier l’emporte** sur les clés dupliquées.

## Migration depuis un compose « en dur »

1. Copier le `docker-compose.staging.yml` actuel du VPS.
2. Remplacer chaque valeur de config par `${NOM_EXPLICITE}`.
3. Lister ces noms dans `docker-compose.staging.env.example`, puis créer **`docker-compose.staging.env`** sur le serveur (non commité).
4. Vérifier : `docker compose --env-file ./docker-compose.staging.env -f docker-compose.staging.yml config`.

## Exemples dans ce dépôt

- `examples/docker-compose.staging.skeleton.yml` — squelette minimal (pattern uniquement).
- `examples/docker-compose.staging.env.example` — variables d’interpolation pour ce squelette.
- `examples/env.staging.example` — placeholder côté **app** (sur le VPS : fichier réel `.env.staging` ; le squelette pointe vers l’exemple pour validation locale).

Pour valider le squelette : `cd deploy/contabo/examples && docker compose --env-file docker-compose.staging.env.example -f docker-compose.staging.skeleton.yml config`.

Les chemins réels des stacks : `deploy/CONTABO-VPS-STAGING.md`.

## Nginx sur Contabo

Le snippet `/etc/nginx/snippets/cppeurope-staging-prefix.conf` référence des **ports loopback** (ex. 17004, 17016). Après externalisation, **aligner** ces ports avec `STAGING_HOST_PORT` (ou équivalent) défini dans l’env Compose du service concerné, pour éviter le décalage nginx ↔ conteneur.
