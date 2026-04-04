// File: lespremices/user-backend/server.dev.js
require('./config/loadEnv.js');


const dotenv = require('dotenv');
// Charger le bon fichier .env selon NODE_ENV (ici .env.development)
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

const app = require('./app');
const { sequelize } = require('./models');

const port = process.env.PORT || 6000;

console.log('⏳ Tentative de connexion USER-BACKEND (dev)...');

sequelize.sync({ force: false })
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`✅ USER-BACKEND lancé en HTTP sur le port ${port} (development)`);
    });
  })
  .catch(err => {
    console.error('❌ Erreur de connexion USER-BACKEND (dev):', err);
  });
