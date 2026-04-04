// File: user-backend/app.js

const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const apiRouter = require('./apiRouter').router;

// Removing getSignature import and associated route

const app = express();

// 🔐 Charger .env.production en prod
dotenv.config({ path: path.join(__dirname, '.env.production') });

// 🧩 Construire ALLOWED_ORIGINS à partir de REACT_APP_URL si non défini
// ex: REACT_APP_URL=https://lespremices.com
if (!process.env.ALLOWED_ORIGINS && process.env.REACT_APP_URL) {
  const base = process.env.REACT_APP_URL;
  process.env.ALLOWED_ORIGINS = [
    base,                                      // https://lespremices.com
    base.replace('://', '://www.'),            // https://www.lespremices.com
  ].join(',');
}

const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

console.log('🌍 CORS allowedOrigins (user-backend) :', allowedOrigins);

// 🔐 CORS
app.use((req, res, next) => {
  console.log('--- CORS DEBUG ---');
  console.log('Method:', req.method);
  console.log('Origin header:', req.headers.origin);
  console.log('URL:', req.originalUrl);
  cors({
    origin: function (origin, callback) {
      console.log('CORS check for origin:', origin);
      if (!origin) {
        console.log('CORS: Pas d\'origin, requête acceptée');
        return callback(null, true);
      }
      if (isDev || allowedOrigins.includes(origin)) {
        console.log('CORS: Origin autorisé');
        return callback(null, true);
      }
      console.log('CORS: Origin refusé');
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type','Authorization']
  })(req, res, function(err) {
    if (err) {
      console.log('CORS ERROR:', err.message);
      return res.status(403).json({ error: 'CORS error: Origin not allowed', details: err.message });
    }
    next();
  });
});

// S'assurer que toutes les routes acceptent OPTIONS
app.options('*', cors());
app.options('*', cors());

// 📦 Middlewares
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// 🔁 Routes
app.get('/', (req, res) => res.status(200).send('USER-BACKEND (prod) actif'));
app.get('/api/ping', async (req, res) => {
  try {
    const { sequelize } = require('./models');
    await sequelize.authenticate();
    res.status(200).json({ ok: true, db: 'ok' });
  } catch (e) {
    res.status(500).json({ ok: false, db: 'error', error: e.message });
  }
});
app.use('/api', apiRouter);

module.exports = app;