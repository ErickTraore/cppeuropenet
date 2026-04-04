/**
 * Attente des services listés dans services-inventory.json (mêmes URLs que precheck-e2e.js).
 * Utilisé par start+cypress-e2e.sh pour éviter de dupliquer ports/URLs en dur dans le shell.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const INVENTORY_PATH = path.resolve(__dirname, '../services-inventory.json');
const MAX_ATTEMPTS = Number(process.env.E2E_WAIT_MAX_ATTEMPTS || 30);
const DELAY_MS = Number(process.env.E2E_WAIT_DELAY_MS || 2000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestGet(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve({ ok: true, status: res.statusCode });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message || 'error' }));
  });
}

async function checkFrontend() {
  const res = await requestGet('http://localhost:8082/');
  return res.ok && [200, 304].includes(res.status);
}

async function checkPing(port) {
  const res = await requestGet(`http://localhost:${port}/api/ping`);
  return res.ok && [200, 304, 400, 401].includes(res.status);
}

async function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error(`Fichier introuvable: ${INVENTORY_PATH}`);
    process.exit(1);
  }
  const services = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const backends = services.filter((s) => s.port !== 8082);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const failed = [];
    if (!(await checkFrontend())) failed.push('frontend (8082)');
    for (const s of backends) {
      if (!(await checkPing(s.port))) failed.push(`${s.name} (${s.port})`);
    }
    if (failed.length === 0) {
      console.log('wait-e2e-services: tous les services répondent.');
      process.exit(0);
    }
    console.log(`  ⏳ attente... (${attempt}/${MAX_ATTEMPTS}) — KO: ${failed.join(', ')}`);
    if (attempt < MAX_ATTEMPTS) await sleep(DELAY_MS);
  }

  console.error('wait-e2e-services: timeout — services encore inaccessibles.');
  process.exit(3);
}

main();
