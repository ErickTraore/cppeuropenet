'use strict';
/**
 * Crée admin2026 et user2026 uniquement via POST /api/users/register/ (même chemin que l’UI et Cypress).
 * Effet : User + Profile + 4 slots médias profil si le backend user-media-profile répond (voir usersCtrl.register).
 *
 * Idempotent : 201 = créé, 409 = déjà existant (les deux sont considérés comme succès).
 *
 * Usage :
 *   cd user-backend && API_BASE=http://localhost:7001 node scripts/create-users-2026.js
 *
 * Le serveur user-backend doit être démarré ; aucune création directe en base depuis ce script.
 */
const API_BASE = (process.env.API_BASE || 'http://localhost:7001').replace(/\/$/, '');

const USERS = [
  { email: 'admin2026@cppeurope.net', password: 'admin2026!', isAdmin: true },
  { email: 'user2026@cppeurope.net', password: 'user2026!', isAdmin: false },
];

async function run() {
  const fetch = (await import('node-fetch')).default;
  let exitCode = 0;

  for (const { email, password, isAdmin } of USERS) {
    const res = await fetch(`${API_BASE}/api/users/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, isAdmin }),
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 201 || res.status === 200) {
      console.log('OK créé:', email, data.userId != null ? `(userId=${data.userId})` : '');
    } else if (res.status === 409) {
      console.log('Déjà existant (409):', email);
    } else {
      console.error('Échec:', email, 'HTTP', res.status, data);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
