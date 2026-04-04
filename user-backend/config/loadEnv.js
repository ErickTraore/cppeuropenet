const path = require('path');
const dotenv = require('dotenv');


const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;

console.log(`🔧 Chargement du fichier d'environnement : ${envFile}`);

dotenv.config({
  path: path.resolve(process.cwd(), envFile)
});
