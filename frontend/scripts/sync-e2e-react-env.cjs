#!/usr/bin/env node
/**
 * Source unique des URLs REACT_APP_* pour les builds E2E locaux : aligné sur
 * cypress/support/e2eServiceEndpoints.cjs (+ HOSTINGER_FRONTEND_PORT).
 * Écrit .env.production.local pour que `npm run build` embarque les mêmes cibles que Cypress.
 */
const fs = require('fs');
const path = require('path');
const { E2E_ENV } = require('../cypress/support/e2eServiceEndpoints.cjs');

const root = path.resolve(__dirname, '..');
const outPath = path.join(root, '.env.production.local');

const host = process.env.E2E_REACT_HOST || '127.0.0.1';
const frontPort = process.env.HOSTINGER_FRONTEND_PORT || '8082';
const profile = String(process.env.CYPRESS_E2E_PROFILE || process.env.E2E_REACT_PROFILE || 'local').toLowerCase();
const isStagingProfile = profile === 'staging';

function base(port) {
  return `http://${host}:${port}`;
}

const lines = isStagingProfile
  ? [
      '# Généré par scripts/sync-e2e-react-env.cjs — profile staging (same-origin /api)',
      '# Ne pas éditer à la main pour l’E2E. Pour conserver un .env manuel: E2E_SKIP_SYNC_ENV=1.',
      'REACT_APP_USER_API=/api/users',
      'REACT_APP_PRESSE_GENERALE_API=/api/presse-generale',
      'REACT_APP_PRESSE_LOCALE_API=/api/presse-locale',
      'REACT_APP_MEDIA_API=/api/user-media-profile',
      'REACT_APP_PROFILE_MEDIA_API=/api/user-media-profile',
      'REACT_APP_PRESSE_LOCALE_MEDIA_API=/api/media-locale',
      'REACT_APP_BASE_URL=/',
      'REACT_APP_PRESSE_LOCALE_BASE_URL=/',
      'REACT_APP_PRESSE_LOCALE_SITE_KEY=cppEurope',
      'REACT_APP_SESSION_EXPIRY_WARNING=60',
      '',
    ]
  : [
      '# Généré par scripts/sync-e2e-react-env.cjs — ports: cypress/support/e2eServiceEndpoints.cjs',
      '# Ne pas éditer à la main pour l’E2E local. Pour conserver un .env manuel: E2E_SKIP_SYNC_ENV=1.',
      `REACT_APP_USER_API=${base(frontPort)}/api/users`,
      `REACT_APP_PRESSE_GENERALE_API=${base(E2E_ENV.E2E_PORT_PRESSE_GENERALE)}/api`,
      `REACT_APP_PRESSE_LOCALE_API=${base(E2E_ENV.E2E_PORT_PRESSE_LOCALE)}/api`,
      `REACT_APP_MEDIA_API=${base(E2E_ENV.E2E_PORT_USER_MEDIA_PROFILE)}/api/user-media-profile`,
      `REACT_APP_PROFILE_MEDIA_API=${base(frontPort)}/api/user-media-profile`,
      `REACT_APP_PRESSE_LOCALE_MEDIA_API=${base(frontPort)}/api/media-locale`,
      `REACT_APP_BASE_URL=${base(frontPort)}`,
      `REACT_APP_PRESSE_LOCALE_BASE_URL=${base(frontPort)}`,
      'REACT_APP_PRESSE_LOCALE_SITE_KEY=cppEurope',
      'REACT_APP_SESSION_EXPIRY_WARNING=60',
      '',
    ];

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
if (isStagingProfile) {
  console.log(`[sync-e2e-react-env] Écrit ${path.relative(root, outPath)} (profile staging, same-origin /api).`);
} else {
  console.log(`[sync-e2e-react-env] Écrit ${path.relative(root, outPath)} (${base(frontPort)}, presse ${E2E_ENV.E2E_PORT_PRESSE_GENERALE})`);
}
