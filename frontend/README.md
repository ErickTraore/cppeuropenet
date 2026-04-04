# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

## E2E Cypress (Rappel)

Pour eviter des echecs inutiles, utiliser toujours ce flux:

1. `npm run pretest:e2e`
2. `npm run cypress:run:guarded`

Le script `cypress:run:guarded` lance automatiquement le pre-test et n'execute Cypress que si les prerequis sont valides.

### `npm install`
### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

### 'resolve ppaci view'

Pour pouvoir démarrer le logitiel frontend3, il est impératif d'exécuter cette ligne:
"export NODE_OPTIONS=--openssl-legacy-provider"
"export NODE_OPTIONS=--openssl-legacy-provider"


### 'opérations d installation de l app'

MYSQL
/Applications/MAMP/Library/bin/mysql80/bin/mysql -u root -p
@Erick2691
show database;

USE database_development;
show tables;
select * from Messages;
DESCRIBE Messages;
DELETE FROM Messages WHERE id BETWEEN 200 AND 261;
USE media_development;
select * from Medias;

BACKEND
cd user-backend
cd media-backend
npm i
node server.js

FRONTEND
cd frontend
export NODE_OPTIONS=--openssl-legacy-provider
npm i
nodemon

### 'Mettre mdp -u root dans .env'


---------------------------------------------------------
Avertissements ESLint
Au lieu de : <p>🎉 Bienvenue !</p>, faire : <p><span role="img" aria-label="fête">🎉</span> Bienvenue !</p>

---------------------------------

tu n’as pas besoin de tout casser, juste de faire un redémarrage propre + rebuild de la stack Docker pour être sûr que tout le code et les configs sont pris en compte.

Voici la procédure complète, à refaire à chaque fois que tu veux “réinitialiser proprement” l’app :

Depuis /var/www/lespremices – arrêter et nettoyer les conteneurs existants :

Copy
docker compose down
(Optionnel mais sain) – nettoyer les images liées au projet si tu as modifié les Dockerfile ou les dépendances :

Copy
docker image prune -f
Si tu as des build: dans ton docker-compose.yml, tu peux forcer un rebuild avec :

Copy
docker compose build --no-cache
Redémarrer toute l’application en arrière‑plan :

Copy
docker compose up -d
Vérifier que tous les services sont bien “Up” :

Copy
docker ps
docker logs --tail=50 lespremices-user-backend-1
docker logs --tail=50 lespremices-media-backend-1
Valider que tout répond comme attendu (sanity check) :

Copy
# Nginx interne
curl -i -X POST http://localhost:8081/api/users/register

# Domaine HTTPS
curl -i -X POST https://lespremices.com/api/users/register
Si tu veux une “réinit totale” (y compris DB), il faudrait en plus supprimer le volume MariaDB :

Copy
docker compose down -v   # ATTENTION : efface toutes les données de la base
docker compose up -d
Dis-moi si tu veux qu’on prépare un script reset.sh qui enchaîne ces étapes pour toi automatiquement.



🎯 Résumé
Backend → packagé dans Docker → docker compose build user-backend && docker compose up -d.

Frontend → compilé localement → npm run build, puis docker compose up -d nginx.



Après une réinitialisation du vps: 
1.   ./deploy.sh => pour les sites normaux
2.   cd /var/www/lespremices
    docker compose restart nginx
    pour ls sites dockerisés.