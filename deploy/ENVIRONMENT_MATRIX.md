# Matrice Config & Infra (Dev / Staging / Prod)

Ce document verrouille les variables critiques par environnement pour limiter les regressions de config.

## 1) Vue d'ensemble

| Environnement | Compose principal | Node env attendu | URL front de reference |
|---|---|---|---|
| Local dev | `docker-compose.dev.yml` | `development` | `http://localhost:8082` |
| Staging | `docker-compose.staging.yml` | `production` | `http://93.127.167.134:9085` (ou domaine staging) |
| Production | `docker-compose.yml` | `production` | `https://cppeurope.net` |

Interpolation `${…}` dans les YAML Compose (ports, CORS explicites, variables frontend) :

| Environnement | Fichiers `--env-file` (voir `.example` versionnés) |
|---|---|
| Local dev | `docker-compose.development.env` |
| Staging | `user-backend/.env.staging` puis `docker-compose.staging.env` (ordre : staging-compose.sh) |
| Production | `docker-compose.production.env` |

Raccourcis : `./scripts/dev-compose.sh`, `./scripts/staging-compose.sh`, `./scripts/production-compose.sh`.

## 2) User-backend (Hostinger)

Variables critiques:

- `NODE_ENV`
- `ALLOWED_ORIGINS`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`
- `JWT_SIGN_SECRET`, `JWT_REFRESH_SECRET`

Attendus:

- Local: `NODE_ENV=development`, CORS local autorise.
- Staging/Prod: `NODE_ENV=production`, `ALLOWED_ORIGINS` doit inclure l'origine navigateur exacte.

Risque connu:

- Si l'origine Cypress n'est pas dans `ALLOWED_ORIGINS`, login UI retourne `403` (CORS), meme si l'API login fonctionne via `curl`.

## 3) Frontend proxy (Hostinger)

Variables critiques:

- `PROXY_UPSTREAM_HOST_HEADER`
- `CONTABO_PATH_PREFIX` (staging uniquement)
- `PRESSE_*_HOST` / `PRESSE_*_PORT`
- `MEDIA_*_HOST` / `MEDIA_*_PORT`
- `HOME_CONFIG_HOST`, `HOME_CONFIG_PORT`

Attendus:

- Staging: prefixe `CONTABO_PATH_PREFIX=/cppeurope-staging`.
- Prod: pas de prefixe staging.
- `PROXY_UPSTREAM_HOST_HEADER=cppeurope.net` pour les backends Contabo.

## 4) Contabo (presse/media)

### 4.1 Staging mediaGle

Variable critique:

- `PRESSE_BASE_URL` (dans `/opt/contabo-cppeurope/mediaGle-backend/.env.staging` et compose staging)

Valeur attendue:

- `http://62.171.186.233/cppeurope-staging`

Pourquoi:

- Le media backend doit verifier le format article via l'endpoint staging:
  - `GET /cppeurope-staging/api/presse-generale/messages/:id/format`

Symptome si mauvais:

- Upload image/video retourne `503`:
  - `"Impossible de verifier le format de l'article (presse indisponible ou message introuvable)."`

### 4.2 Snippet nginx staging Contabo

Fichier attendu:

- `/etc/nginx/snippets/cppeurope-staging-prefix.conf`

Doit router:

- `/cppeurope-staging/api/media/` -> `127.0.0.1:17004`
- `/cppeurope-staging/api/presse-generale/` -> `127.0.0.1:17016`
- autres APIs staging vers leurs ports 17005/17006/17007

## 5) Home (a ne pas casser)

Home est gere par `home-config-backend` (SQLite volume dedie).

A conserver:

- volume `home-config-data` (prod)
- volume `home-config-staging-data` (staging)

Ne pas inclure Home dans les resets data de presse/users.

## 6) Verification rapide avant release

### Local

```bash
./scripts/release-check.sh local
```

### Staging

```bash
./scripts/release-check.sh staging
```

### Prod smoke

```bash
./scripts/release-check.sh prod-smoke
```

## 7) Regle anti-drift

A chaque changement d'URL, proxy, CORS, JWT ou routage Contabo:

1. Mettre a jour les fichiers d'env/compose concernes.
2. Mettre a jour ce document.
3. Rejouer au minimum:
   - `035_presseGeneraleConsultAfterCreateOption2`
   - `036_presseGeneraleConsultAfterCreateOption3`
   - smoke auth prod (`006` + `009`).

