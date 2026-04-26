/**
 * Ports / hôte des backends Contabo pour les E2E — alignés sur services-inventory.json.
 * Source unique : importé par cypress.config.cjs (e2e.env) et par les specs (contaboOrigin).
 * Charge aussi un fichier d'environnement dédié Cypress (par défaut .env.cypress),
 * pour éviter les ports/hôtes en dur entre local et staging.
 * Pour override shell : définir CYPRESS_E2E_* avant cypress run (nécessite allowCypressEnv: true)
 * ou modifier .env.cypress(.staging).
 */
function isBrowserRuntime() {
  return typeof Cypress !== 'undefined';
}

function stripOptionalQuotes(value) {
  if (!value) return value;
  const v = String(value).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function loadCypressEnvFileNode() {
  if (isBrowserRuntime()) return;
  const fs = require('fs');
  const path = require('path');

  const root = path.resolve(__dirname, '../..');
  const fileFromEnv = String(process.env.CYPRESS_ENV_FILE || '').trim();
  const envFilePath = fileFromEnv
    ? (path.isAbsolute(fileFromEnv) ? fileFromEnv : path.resolve(root, fileFromEnv))
    : path.resolve(root, '.env.cypress');

  if (!fs.existsSync(envFilePath)) return;

  const lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    const value = stripOptionalQuotes(line.slice(eq + 1));
    if (!key) continue;
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = value;
    }
  }
}

loadCypressEnvFileNode();

function envValue(name, fallback) {
  if (isBrowserRuntime()) {
    const v = Cypress.env(name);
    return v != null && String(v).length > 0 ? String(v) : String(fallback);
  }
  const v = process.env[`CYPRESS_${name}`] || process.env[name];
  return v != null && String(v).length > 0 ? String(v) : String(fallback);
}

function readInventoryNode() {
  const fs = require('fs');
  const path = require('path');
  const inventoryPath = path.resolve(__dirname, '../../services-inventory.json');
  if (!fs.existsSync(inventoryPath)) {
    throw new Error(`e2eServiceEndpoints: inventaire introuvable (${inventoryPath})`);
  }
  const data = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  if (!Array.isArray(data)) {
    throw new Error('e2eServiceEndpoints: services-inventory.json doit être un tableau');
  }
  return data;
}

function findPort(inventory, matcher, fallback) {
  const svc = inventory.find((s) => typeof s?.name === 'string' && matcher(s.name.toLowerCase()));
  return String((svc && svc.port) || fallback);
}

function buildEnvFromInventory() {
  const inventory = readInventoryNode();
  const host = envValue('E2E_BACKEND_HOST', 'localhost');
  return {
    E2E_BACKEND_HOST: host,
    E2E_PORT_MEDIA_GLE: findPort(inventory, (n) => n.includes('mediagle-backend'), 7004),
    E2E_PORT_MEDIA_LOCALE: findPort(inventory, (n) => n.includes('medialocale-backend'), 7008),
    E2E_PORT_PRESSE_GENERALE: findPort(inventory, (n) => n.includes('pressegenerale-backend'), 7012),
    E2E_PORT_PRESSE_LOCALE: findPort(inventory, (n) => n.includes('presselocale-backend'), 7005),
    E2E_PORT_USER_MEDIA_PROFILE: findPort(inventory, (n) => n.includes('usermediaprofile-backend'), 7017),
    E2E_PORT_USER_BACKEND: findPort(inventory, (n) => n.includes('user-backend'), 7001),
  };
}

function buildEnvFromCypress() {
  return {
    E2E_BACKEND_HOST: envValue('E2E_BACKEND_HOST', 'localhost'),
    E2E_PORT_MEDIA_GLE: envValue('E2E_PORT_MEDIA_GLE', 7004),
    E2E_PORT_MEDIA_LOCALE: envValue('E2E_PORT_MEDIA_LOCALE', 7008),
    E2E_PORT_PRESSE_GENERALE: envValue('E2E_PORT_PRESSE_GENERALE', 7012),
    E2E_PORT_PRESSE_LOCALE: envValue('E2E_PORT_PRESSE_LOCALE', 7005),
    E2E_PORT_USER_MEDIA_PROFILE: envValue('E2E_PORT_USER_MEDIA_PROFILE', 7017),
    E2E_PORT_USER_BACKEND: envValue('E2E_PORT_USER_BACKEND', 7001),
  };
}

const E2E_ENV = isBrowserRuntime() ? buildEnvFromCypress() : buildEnvFromInventory();

function contaboOrigin(portKey) {
  const host = E2E_ENV.E2E_BACKEND_HOST;
  const port = E2E_ENV[portKey];
  if (!host || !port) {
    throw new Error(`e2eServiceEndpoints: clé manquante ou invalide (${portKey})`);
  }
  return `http://${host}:${port}`;
}

module.exports = { E2E_ENV, contaboOrigin };
