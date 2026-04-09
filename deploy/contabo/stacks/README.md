# Stacks Contabo (`/opt/contabo-cppeurope/`)

Fichiers versionnés ici ; sur le VPS ils sont copiés dans chaque répertoire backend. Les **secrets** restent dans `docker-compose.production.env` (non versionné, généré depuis `*.example`).

## Production (exemple mediaGle)

```bash
cd /opt/contabo-cppeurope/mediaGle-backend
docker compose --env-file docker-compose.production.env -f docker-compose.yml up -d
```

## Staging mediaGle

```bash
cd /opt/contabo-cppeurope/mediaGle-backend
docker compose --env-file docker-compose.staging.env --env-file .env.compose-staging \
  -f docker-compose.staging.yml -p media-staging-gle up -d
```

## Staging presse locale + médias (répertoire dédié)

```bash
cd /opt/contabo-cppeurope/staging-compose-media-locale-ump
docker compose --env-file docker-compose.staging.env --env-file .env.compose \
  -f docker-compose.yml -p staging-ml-ump up -d
```

## Presse locale (staging)

```bash
cd /opt/contabo-cppeurope/presseLocale-backend
docker compose --env-file docker-compose.staging.env --env-file .env.compose-staging-pl \
  -f docker-compose.staging.yml -p staging-presse-locale up -d
```

Vérifier la config sans démarrer : ajouter `config` à la place de `up -d`.
