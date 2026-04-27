// user-backend/config/config.js
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');


// Chargement dynamique du bon .env selon l'environnement
// Priorité : .env.staging > .env.development/production selon NODE_ENV
let envFile = '.env.production';
if (process.env.NODE_ENV === 'development') {
  envFile = '.env.development';
}
// Vérifier si .env.staging existe et l'utiliser en priorité (pour staging sur Hostinger)
const stagingEnvPath = path.join(__dirname, '..', '.env.staging');
if (fs.existsSync(stagingEnvPath)) {
  envFile = '.env.staging';
}
dotenv.config({ path: path.join(__dirname, '..', envFile) });

module.exports = {
  development: {
    database: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, // utilise le nom du service Docker mariadb
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mysql'
  },
  test: {
    database: process.env.DB_NAME_USER_TEST,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST, // force localhost
    dialect: process.env.DB_DIALECT || 'mysql'
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST || 'mariadb',
    port: process.env.DB_PORT || 3306,
    dialect: process.env.DB_DIALECT || 'mariadb',
    logging: false,

  }
};
