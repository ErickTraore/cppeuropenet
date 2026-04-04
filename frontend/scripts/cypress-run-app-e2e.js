/**
 * E2E « application » : exclut les specs 002–007 (inventaire / ping de tous les services Docker).
 * Prérequis : backends utilisés par les parcours (7001, 7004, 7005, 7008, 7012, 7017…) + server.dev.js sur CYPRESS_BASE_URL.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const e2eDir = path.join(__dirname, '../cypress/e2e');
const files = fs
  .readdirSync(e2eDir)
  .filter((f) => f.endsWith('.cy.js'))
  .filter((f) => !/^00[2-7]_/.test(f))
  .sort()
  .map((f) => path.join('cypress/e2e', f))
  .join(',');

const baseUrl = process.env.CYPRESS_BASE_URL || 'http://localhost:8092';
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.BROWSERSLIST_IGNORE_OLD_DATA = '1';

const r = spawnSync(
  'npx',
  [
    'cypress',
    'run',
    '--config',
    `baseUrl=${baseUrl},defaultCommandTimeout=300000`,
    '--spec',
    files,
  ],
  { stdio: 'inherit', cwd: path.join(__dirname, '..'), env, shell: false }
);
process.exit(r.status === null ? 1 : r.status);
