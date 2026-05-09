# ✅ Procédure Développeur E2E — 9 Étapes Rigides

**Date**: 9 mai 2026 — STABILISÉ  
**Statut**: ✅ Tous les tests exécutent jusqu'à la fin (45/45 specs)  
**Ports Sync**: ✅ `.env.cypress` == `services-inventory.json` (presseGenerale: 7016, userMediaProfile: 7007)  

---

## 📋 Règles d'Or

1. **Ne JAMAIS modifier les ports à la main** — utiliser `services-inventory.json` comme source unique
2. **Ne JAMAIS ignorer une erreur de code de sortie non nul** — toujours aller à Étape 9
3. **Ne JAMAIS relancer un seul conteneur** — toujours utiliser les scripts e2e:docker-up
4. **Chaque étape est obligatoire** — ne pas sauter les validations
5. **Reproduibilité garantie** — exécuter la procédure donne le même résultat

---

## Étape 1 — Vérifier le dossier de travail

```bash
cd /Users/traore/Documents/sites/sitesEnProductions.v1
pwd
ls
```

**✅ Résultat attendu:**
- `pwd` → `/Users/traore/Documents/sites/sitesEnProductions.v1`
- `ls` affiche `contabo-cppeurope` et `hostinger-cppeurope`

**❌ Sinon STOP**: Répertoire invalide. Procédure non applicable.

---

## Étape 2 — Démarrer Docker Desktop

```bash
open -a Docker
```

**✅ Vérification**: L'icône Docker apparaît dans la barre macOS (haut à droite).  
**⏱️ Attendre**: 30-60 secondes pour le lancement complet.

---

## Étape 3 — Vérifier que le daemon Docker est prêt (OBLIGATOIRE)

```bash
for i in {1..60}; do
  docker info >/dev/null 2>&1 && break
  echo "[wait-docker] Docker en cours de demarrage..."
  sleep 2
done
docker info >/dev/null
echo "[ok] Docker daemon pret"
```

**✅ Résultat attendu**: Code de sortie `0` et message `[ok] Docker daemon pret`

**❌ Sinon STOP**: Docker n'est pas prêt ou mal installé. Relancer `open -a Docker` et attendre.

---

## Étape 4 — Éteindre COMPLÈTEMENT tous les services

```bash
bash hostinger-cppeurope/scripts/e2e-reset-two-vps.sh
```

**✅ Logs attendus**: Messages `[eteindre]` pour chaque service.  
**⏱️ Durée**: ~10-30 secondes.

**Vérification qu'AUCUN conteneur n'est actif:**
```bash
docker ps | grep -E "presse|media|user-backend" && echo "ERREUR: Conteneurs encore actifs" || echo "OK: Tous eteints"
```

**✅ Résultat attendu**: `OK: Tous eteints` (aucun conteneur retourné)

**❌ Sinon STOP**: Conteneurs résiduels. Utiliser manuellement:
```bash
docker compose down  # dans chaque dossier de service
```

---

## Étape 5 — Réallumer TOUS les serveurs/services

```bash
npm --prefix hostinger-cppeurope/frontend run e2e:docker-up
```

**✅ Logs attendus**:
- Messages `[e2e-docker-up]` avec env-files détectés (docker-compose.production.env.example)
- Messages `up -d` pour chaque service
- **Durée**: ~20-60 secondes

**Vérification — Nombre de conteneurs UP:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "presse|media|user|frontend|nginx" | wc -l
```

**✅ Résultat attendu**: Au minimum **10-12 conteneurs actifs**

**Vérification CRITIQUE — Ports exposés:**
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "presseGenerale|userMediaProfile"
```

**✅ Résultat attendu**:
```
presseGenerale-backend-presse-generale-backend-1      0.0.0.0:7016->7016/tcp
userMediaProfile-backend-userMediaProfile-backend-1    127.0.0.1:7007->7007/tcp
```

**⚠️ CRITIQUE — Si ports sont 17012/7017 ou autres:**
- **STOP immédiatement**
- Vérifier que `contabo-cppeurope/*/docker-compose.production.env.example` expose `PROD_HOST_PORT` correct
- Exemple presseGenerale: `PROD_HOST_PORT=7016` (pas 17012!)

**❌ Sinon STOP**: Consulter logs:
```bash
docker logs presseGenerale-backend-presse-generale-backend-1
```

---

## Étape 6a — Valider la synchronisation .env.cypress

```bash
node hostinger-cppeurope/frontend/scripts/enforce-services-inventory.js
```

**✅ Résultat attendu**: Code de sortie `0` (aucune erreur)

**⚠️ CRITIQUE — Si exit non 0:**
- Le script affiche les fichiers avec des ports **hors inventory**
- Cela signifie `.env.cypress` n'est pas synchronisé avec `services-inventory.json`
- **FIX**:
  ```bash
  cp hostinger-cppeurope/frontend/.env.cypress.example hostinger-cppeurope/frontend/.env.cypress
  ```
- Relancer le garde-fou jusqu'à exit 0:
  ```bash
  node hostinger-cppeurope/frontend/scripts/enforce-services-inventory.js
  # Exit 0? Excellent, continuer.
  ```

---

## Étape 6b — Lancer la campagne E2E complète

```bash
npm --prefix hostinger-cppeurope/frontend run e2e:cold
```

**✅ Logs attendus**:
- `Compose down` ✅
- `Compose up -d` ✅
- `Guard contracts` ✅
- `Precheck e2e` ✅
- `Cypress run` ✅ (lance 45 specs)

**✅ Résultat final attendu**: 
- Code de sortie `0`
- Affichage de tous les **45 specs** (même avec quelques failures métier, c'est OK)

**❌ Diagnostic si ça échoue:**

- **Si `Precheck e2e KO`**: Services inaccessibles → **Aller à Étape 9**
- **Si `Cypress ne lance pas`**: Code non 0 → **Aller à Étape 9**
- **Si `Cypress se bloque`**: Pas de sortie depuis 5 min → Ctrl+C et **Aller à Étape 9**

---

## Étape 7 — Valider la stabilité (3 passes consécutives)

```bash
npm --prefix hostinger-cppeurope/frontend run e2e:new:stable
```

**✅ Résultat final attendu**: `ALL_GREEN` (tous les runs 1, 2, 3 passent complètement)

**💡 Note**: Les **bugs métier** (upload échoue, images ne s'affichent pas) ne bloquent **PAS** cette étape.  
Seuls les **bugs INFRA** bloquent (ports inaccessibles, services down).

**❌ Si partiellement vert**: Une infra s'est cassée entre run 1 et run 2 → **Aller à Étape 9**

---

## Étape 8 — Accepter ou rejeter le run

### ✅ Critère PASS (Serveur STABLE)

- ✅ Chaque commande (étapes 2-7) = code sortie `0`
- ✅ Cypress lance et affiche tous les **45 specs**
- ✅ Precheck `OK` (tous les endpoints /api/ping répondent)
- ✅ Résultat stabilité = `ALL_GREEN`

**Conclusion**: 🟢 **Serveur STABLE**. Code prêt pour être **poussé vers staging/production**.

### ❌ Critère FAIL (Serveur INSTABLE)

- ❌ Code de sortie non nul à n'importe quelle étape
- ❌ Cypress ne lance pas ou s'arrête prématurément
- ❌ Precheck échoue (services inaccessibles)
- ❌ Résultat stabilité != `ALL_GREEN`

**Conclusion**: 🔴 **Serveur INSTABLE**. NE PAS pousser. **Aller à Étape 9**.

---

## Étape 9 — Procédure en cas d'échec (Debug Déterministe)

### Règle d'Or
**Ne jamais corriger « à la volée ». Toujours utiliser cette séquence rigoureuse.**

### Séquence de redémarrage (toujours faire dans cet ordre)

#### 1️⃣ Arrêt complet (Étape 4)
```bash
bash hostinger-cppeurope/scripts/e2e-reset-two-vps.sh
```
**Attendre** que TOUS les conteneurs soient arrêtés (vérifier avec `docker ps`).

#### 2️⃣ Redémarrage complet (Étape 5)
```bash
npm --prefix hostinger-cppeurope/frontend run e2e:docker-up
```
**Vérifier** que les ports sont corrects (Étape 5 complète).

#### 3️⃣ Validation infra (Étape 6a)
```bash
node hostinger-cppeurope/frontend/scripts/enforce-services-inventory.js
```

Si exit non 0:
```bash
cp hostinger-cppeurope/frontend/.env.cypress.example hostinger-cppeurope/frontend/.env.cypress
node hostinger-cppeurope/frontend/scripts/enforce-services-inventory.js
# Relancer jusqu'à exit 0
```

#### 4️⃣ Re-test E2E (Étape 6b)
```bash
npm --prefix hostinger-cppeurope/frontend run e2e:cold
```

### Diagnostic avancé (seulement si on arrive ici)

**Vérifier les logs des services:**
```bash
docker logs presseGenerale-backend-presse-generale-backend-1 | tail -50
docker logs userMediaProfile-backend-userMediaProfile-backend-1 | tail -50
```

**Vérifier les ports exposes:**
```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

**Vérifier la connectivité manuelle:**
```bash
curl -v http://127.0.0.1:7016/api/ping
curl -v http://127.0.0.1:7007/api/ping
```

**Vérifier les env files détectées:**
```bash
ls -la contabo-cppeurope/presseGenerale-backend/docker-compose*.env*
ls -la contabo-cppeurope/userMediaProfile-backend/docker-compose*.env*
```

### ❌ Liste Noire (NE JAMAIS FAIRE)

| ❌ | Au lieu de |
|----|-----------|
| Modifier `.env.cypress` manuellement | Utiliser `services-inventory.json` comme source unique |
| Relancer un seul conteneur avec `docker compose up` | Utiliser `npm run e2e:docker-up` (orchestre tout) |
| Ignorer une erreur et continuer | Étape 9 est obligatoire, toujours diagnostiquer |
| Coder une « correction rapide » (tweaks ad-hoc) | Les corrections durables se font dans le code, commitées et pushées |
| Modifier les ports dans docker-compose.yml | Les ports viennent de docker-compose.production.env.example |

---

## Résultat attendu après Étape 9

### Scénario A : Le run réussit
- Code de sortie `0`
- Precheck OK
- Les 45 specs s'exécutent jusqu'à la fin
- Résultat: **Continuer à Étape 7 (stabilité)**

### Scénario B : Bug déterministe identifié
- Logs clairs (stack trace, erreur reproductible)
- Port manquant, conteneur crashé, connectivité cassée
- **Action**: Reporter le bug avec les logs complets (ne pas improviser)

### Scénario C : Impossible de progresser après 2 tours
- La procédure a été exécutée deux fois complètement
- Le serveur reste instable
- **Action**:
  1. Consulter les `README.md` des services individuels
  2. Vérifier l'historique git (`git log --oneline -20`)
  3. Contacter le maintaineur avec les **logs complets** de Étape 9

---

## 🔒 Garanties après exécution complète des 9 étapes

1. ✅ **Reproductibilité**: Exécuter à nouveau = même résultat
2. ✅ **Ports synchronisés**: `.env.cypress` == `services-inventory.json` == docker-compose.production.env.example
3. ✅ **Tests exécutent complets**: Les 45 specs tournent jusqu'au bout (même si failures métier)
4. ✅ **Services accessibles**: Precheck valide que /api/ping répond partout
5. ✅ **Aucune correction ad-hoc**: Juste la procédure, rien d'improvisé

**Si une garantie n'est pas respectée → Bug déterministe à rapporter avec logs.**

---

## 📞 Support

**Le serveur est stable quand Étape 8 passe avec le statut PASS.**  
Sinon, exécuter Étape 9 complètement et rapporter les logs si diagnostic impossible.

**Dernier test réussi**: 9 mai 2026, 12m 46s, 45/45 specs exécutés (68/81 tests passants après correction ports)
