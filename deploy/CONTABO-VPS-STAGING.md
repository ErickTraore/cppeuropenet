# Contabo (2ᵉ VPS) — staging exhaustif

Tous les backends **cppeurope** ont une stack **staging** dédiée (BDD et/ou fichiers séparés de la prod, ports **loopback** uniquement). Nginx route `/cppeurope-staging/…` vers ces ports (fichier `/etc/nginx/snippets/cppeurope-staging-prefix.conf`).

| Service | Répertoire | Projet Docker | Port staging | BDD / remarque |
|--------|------------|---------------|--------------|----------------|
| Média presse générale | `mediaGle-backend/` | `media-staging-gle` | **17004** | MariaDB `media_staging_cppeurope_v1`, `./uploads-staging` |
| Média presse locale + profils médias | `staging-compose-media-locale-ump/` | `staging-ml-ump` | **17006** (locale), **17007** (UMP) | **Un** MariaDB partagé `media_locale_staging_cppeurope_v1` (comme en prod), uploads séparés sous chaque backend |
| Presse locale | `presseLocale-backend/` | `staging-presse-locale` | **17005** | `presse_locale_staging_cppeurope_v1` |
| Presse générale (mémoire) | `presseGenerale-backend/` | `staging-presse-generale` | **17016** | Pas de BDD ; état mémoire isolé du conteneur prod |

**Variables Docker Compose (pas de littéraux dans les YAML)** : voir `deploy/contabo/README.md` et `deploy/contabo/examples/` (squelette + `docker-compose.staging.env.example`).

Fichiers utiles sur Contabo :

- ` /root/hostinger-staging-jwt.env` — **JWT** alignés sur `user-backend/.env.staging` du VPS principal (pour `presseLocale` staging). Si vous changez les JWT côté Hostinger, **resynchroniser** ce fichier puis redémarrer `staging-presse-locale`.

Commandes :

```bash
# Exemple : état des stacks
docker ps --format '{{.Names}}\t{{.Status}}' | grep -E 'staging|media-staging'

# Migrations (déjà jouées à l’installation ; à relancer si besoin)
docker exec staging-presse-locale-presseLocale-backend-1 sh -c "cd /usr/src/app && NODE_ENV=production npx sequelize-cli db:migrate"
```

**Attention** : ne pas remettre de fichiers `*.bak` dans `/etc/nginx/sites-enabled/` (doublons `server_name`).
