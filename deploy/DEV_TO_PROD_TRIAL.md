# Essais pratiques : développement → production

Checklist courte pour **chaque essai** : une modification part du dev et se valide jusqu’à la prod. Le détail release (gates, journal) reste dans `deploy/RELEASE_RUNBOOK.md`.

## 0) Prérequis

- Clone à jour : `/var/www/cppeurope` (ou machine de dev).
- Fichiers d’interpolation Compose présents si tu touches Docker : `docker-compose.production.env`, `docker-compose.staging.env`, etc. (voir les `*.example`).
- Dépôt : [cppeuropenet](https://github.com/ErickTraore/cppeuropenet) (site Hostinger) — ne pas confondre avec [contabo-cppeurope](https://github.com/ErickTraore/contabo-cppeurope) (2ᵉ VPS).

## 1) Développement (modifier le code)

1. Créer une branche ou travailler sur `main` selon votre habitude.
2. Faire la modification (fichiers source, config, etc.).
3. Vérifier au minimum le frontend :

```bash
cd /var/www/cppeurope/frontend
npm run build
```

4. Optionnel mais recommandé : `./scripts/release-check.sh local` (build + smoke auth).

**Critère de sortie** : build OK, pas d’erreur bloquante sur ce que vous testez.

## 2) Commit et push vers GitHub

```bash
cd /var/www/cppeurope
git status
git add …
git commit -m "feat: … ou fix: …"
git fetch origin
git pull --rebase origin main    # si le push est refusé (historique divergent)
git push origin main
```

**Si `push` refuse** : le remote a avancé — toujours `git pull --rebase origin main` puis `git push` (voir message Git).

## 3) Staging (validation avant prod)

Sur une machine où la stack staging tourne (souvent le même VPS avec `docker-compose.staging.yml`) :

```bash
cd /var/www/cppeurope
git fetch origin && git pull --rebase origin main
./scripts/staging-compose.sh up -d
cd frontend
npm run cypress:run:new -- --config baseUrl=http://93.127.167.134:9085
```

Adapter `baseUrl` si votre URL staging a changé (`deploy/ENVIRONMENT_MATRIX.md`).

**Critère de sortie** : E2E staging verts ou écarts **documentés**.

## 4) Production (déployer le même `main`)

### Option A — GitHub Actions (recommandé)

1. **Actions** → workflow **Deploy** → **Run workflow**.
2. Confirmation : `DEPLOY`, branche : `main` (ou la ref voulue).

### Option B — Manuel sur le VPS principal

```bash
cd /var/www/cppeurope
git fetch origin
git reset --hard origin/main
./deploy-with-tests.sh
./scripts/production-compose.sh down
./scripts/production-compose.sh up -d --build
```

**Critère de sortie** : commandes terminées sans erreur, conteneurs `Up`.

## 5) Vérification post-déploiement (prod)

- Site : `https://cppeurope.net`
- Exemple de trace dans le HTML (meta démo) :

```bash
curl -sS https://cppeurope.net/ | grep -E 'cppeurope-pipeline|meta name'
```

- Smoke minimal : login, navigation presse, home (`deploy/RELEASE_RUNBOOK.md` §6).

## 6) En cas de problème

- **Rollback** : `deploy/ROLLBACK.md`
- **Config / dérive d’env** : `deploy/ENVIRONMENT_MATRIX.md`
- **Incident** : `deploy/INCIDENT_RUNBOOK.md`

---

**Résumé** : *modifier → build local → commit/push → staging (pull + compose + E2E) → prod (Deploy ou compose prod) → vérifs.*
