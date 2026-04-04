# Guide d'utilisation des tests automatisés - CPP Europe

## 🎯 Vue d'ensemble

Ce projet inclut 3 niveaux de tests :

1. **Tests unitaires** (Jest/React Testing Library) - Validation des composants isolés
2. **Tests E2E** (Cypress) - Validation du parcours utilisateur complet  
3. **Script de déploiement** - Validation automatique avant mise en production

---

## 📦 Installation

Les dépendances sont déjà installées. Si besoin :

```bash
cd /var/www/hostinger-cppeurope/frontend
npm install
```

---

## 🧪 Tests Unitaires

### Lancer tous les tests unitaires
```bash
cd /var/www/hostinger-cppeurope/frontend
npm test
```

### Lancer les tests des 4 formats presse
```bash
npm test -- FormArticle FormArticlePhoto FormArticleVideo FormArticleThumbnailVideo
```

### Ce qui est testé
- Affichage des formulaires
- Validations (champs requis, longueurs)
- Soumission des données
- Réinitialisation après succès

---

## 🌐 Tests E2E (Cypress)

### Configuration requise
Avant de lancer Cypress, modifier les identifiants dans :
- `frontend/cypress/support/commands.js` (ligne login)

### Lancer Cypress en mode interactif
```bash
cd /var/www/cppeurope/frontend
npm run cypress:open
```

### Lancer tous les tests E2E en ligne de commande
```bash
npm run cypress:run
```

### Lancer seulement les tests presse
```bash
npm run test:e2e
```

### Ce qui est testé
- Navigation réelle dans le navigateur
- Upload de fichiers réels
- Soumission et validation côté serveur
- Messages de succès/erreur affichés

### Fichiers de test créés
- `cypress/e2e/presse-article.cy.js` - Article uniquement
- `cypress/e2e/presse-article-photo.cy.js` - Article + Photo
- `cypress/e2e/presse-article-video.cy.js` - Article + Vidéo
- `cypress/e2e/presse-article-thumbnail-video.cy.js` - Article + Miniature + Vidéo

---

## 🚀 Script de déploiement automatisé

### Utilisation standard (avec tous les tests)
```bash
cd /var/www/cppeurope
./deploy-with-tests.sh
```

### Ignorer les tests E2E (plus rapide)
```bash
SKIP_E2E=true ./deploy-with-tests.sh
```

### Ce que fait le script
1. ✅ Lance les tests unitaires
2. ✅ Lance les tests E2E (si serveur actif)
3. ✅ Build la version production
4. ⏸️  S'arrête si un test échoue

---

## 📋 Workflow recommandé avant déploiement

### Développement local
```bash
# 1. Faire vos modifications
# 2. Lancer les tests unitaires
npm test

# 3. Si OK, lancer les tests E2E (app doit tourner)
npm run cypress:run
```

### Avant mise en production
```bash
# Option 1 : Tests complets
./deploy-with-tests.sh

# Option 2 : Tests unitaires seulement (plus rapide)
SKIP_E2E=true ./deploy-with-tests.sh
```

### Après validation
```bash
# Déployer avec Docker
docker compose down
docker compose up -d --build
```

---

## ⚙️ Configuration Cypress

### Modifier l'URL de test
Éditer `frontend/cypress.config.js` :

```javascript
{
  "baseUrl": "http://localhost:3000",  // Ou https://cppeurope.net
  // ...
}
```

### Modifier les identifiants de connexion
Éditer `frontend/cypress/support/commands.js` :

```javascript
Cypress.Commands.add('login', (email, password) => {
  // Utiliser vos vrais identifiants admin
})
```

---

## 🐛 Résolution de problèmes

### Cypress ne trouve pas l'app
- Vérifier que l'app tourne sur le port configuré
- Vérifier `baseUrl` dans `cypress.config.js`

### Tests E2E échouent mais tests unitaires passent
- Les tests E2E testent le système complet (frontend + backend + DB)
- Vérifier les logs du backend
- Vérifier que les fichiers uploads sont acceptés

### Script de déploiement bloque
```bash
# Voir où ça bloque
bash -x ./deploy-with-tests.sh

# Ignorer E2E temporairement
SKIP_E2E=true ./deploy-with-tests.sh
```

---

## 📊 Résultats attendus

### Tests unitaires (npm test)
```
PASS  src/components/admin/presse/FormArticle.test.js
PASS  src/components/admin/presse/FormArticlePhoto.test.js
PASS  src/components/admin/presse/FormArticleVideo.test.js
PASS  src/components/admin/presse/FormArticleThumbnailVideo.test.js

Test Suites: 4 passed, 4 total
Tests:       32 passed, 32 total
```

### Tests E2E (npm run test:e2e)
```
  (Run Finished)

       Spec                                              Tests  Passing  Failing
  ┌────────────────────────────────────────────────────────────────────────────┐
  │ ✔  presse-article.cy.js                    00:12        5        5        - │
  ├────────────────────────────────────────────────────────────────────────────┤
  │ ✔  presse-article-photo.cy.js              00:08        3        3        - │
  ├────────────────────────────────────────────────────────────────────────────┤
  │ ✔  presse-article-video.cy.js              00:10        3        3        - │
  ├────────────────────────────────────────────────────────────────────────────┤
  │ ✔  presse-article-thumbnail-video.cy.js    00:11        3        3        - │
  └────────────────────────────────────────────────────────────────────────────┘
    ✔  All specs passed!                        00:41       14       14        -
```

---

## 🎓 Pour aller plus loin

### Ajouter de nouveaux tests Cypress
1. Créer un fichier dans `cypress/e2e/`
2. Suivre la structure des fichiers existants
3. Lancer avec `npm run cypress:run`

### Ajouter de nouveaux tests unitaires
1. Créer un fichier `.test.js` à côté du composant
2. Importer et tester le composant
3. Lancer avec `npm test`

### Intégration CI/CD
Le script `deploy-with-tests.sh` peut être intégré dans :
- GitHub Actions
- GitLab CI
- Jenkins
- Tout système de CI/CD

---

## 📞 Support

Pour toute question sur les tests :
1. Vérifier ce guide
2. Consulter `PRESSE_TESTS.md` pour les détails des tests unitaires
3. Consulter la documentation Cypress : https://docs.cypress.io

---

**Dernière mise à jour :** 2 février 2026
