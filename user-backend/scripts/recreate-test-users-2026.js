'use strict';
/**
 * Supprime user2026 et admin2026, puis les réinscrit via l'API (création des 4 slots sur Contabo).
 * isAdmin: 0 pour user2026, 1 pour admin2026.
 * Usage:
 *   Docker / prod : NODE_ENV=production … node scripts/recreate-test-users-2026.js
 *   Local dev     : NODE_ENV=development API_BASE=http://localhost:7001 node scripts/recreate-test-users-2026.js
 */
const path = require('path');
const envFile =
  process.env.DOTENV_CONFIG_PATH ||
  path.join(
    __dirname,
    '..',
    process.env.NODE_ENV === 'development' ? '.env.development' : '.env.production'
  );
require('dotenv').config({ path: envFile });
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

const { User, Profile, sequelize } = require('../models');

const EMAILS = ['user2026@cppeurope.net', 'admin2026@cppeurope.net'];

const USERS = [
  { email: 'user2026@cppeurope.net', password: 'user2026!', isAdmin: false },  // admin=0
  { email: 'admin2026@cppeurope.net', password: 'admin2026!', isAdmin: true },  // admin=1
];

const API_BASE = (process.env.API_BASE || 'http://localhost:7001').replace(/\/$/, '');

async function deleteUsers() {
  for (const email of EMAILS) {
    const user = await User.findOne({ where: { email } });
    if (user) {
      await Profile.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
      console.log('Supprimé:', email);
    } else {
      console.log('Déjà absent:', email);
    }
  }
}

async function registerViaApi() {
  const fetch = (await import('node-fetch')).default;
  for (const { email, password, isAdmin } of USERS) {
    const res = await fetch(`${API_BASE}/api/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, isAdmin }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      console.log('Inscrit:', email, 'isAdmin=', isAdmin, '→ slots créés sur Contabo');
    } else {
      console.error('Échec inscription', email, res.status, data);
    }
  }
}

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Suppression des comptes existants...');
    await deleteUsers();
    console.log('Réinscription via API (4 slots par profil sur Contabo)...');
    await registerViaApi();
    console.log('Terminé.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
