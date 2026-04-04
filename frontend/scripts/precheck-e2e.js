const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const INVENTORY_PATH = path.resolve(__dirname, '../services-inventory.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestWithTimeout({ method = 'GET', url, body, timeoutMs = 2500 }) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;

    const payload = body ? JSON.stringify(body) : null;
    const req = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method,
        timeout: timeoutMs,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : undefined,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          resolve({ ok: true, status: res.statusCode, body: raw });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('timeout'));
    });

    req.on('error', (err) => {
      resolve({ ok: false, error: err.message || 'network error' });
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function checkWithRetries(check, retries = 3, delayMs = 1000) {
  let last;
  for (let i = 1; i <= retries; i += 1) {
    // Retry to absorb transient container startup/network hiccups.
    last = await check();
    if (last.pass) return { ...last, attempts: i };
    if (i < retries) await sleep(delayMs);
  }
  return { ...last, attempts: retries };
}

function ensureInventory() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    throw new Error(`Fichier introuvable: ${INVENTORY_PATH}`);
  }
  return JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
}

function buildChecks(services) {
  const checks = [];

  checks.push({
    name: 'frontend / (8082)',
    run: async () => {
      const res = await requestWithTimeout({ url: 'http://localhost:8082/' });
      const pass = res.ok && [200, 304].includes(res.status);
      return {
        pass,
        detail: pass ? `HTTP ${res.status}` : res.ok ? `HTTP ${res.status}` : res.error,
      };
    },
  });

  // Une entrée = un check (pas de dédoublonnage par port : deux services sur le même port serait une erreur de config à voir en échec).
  services.forEach((svc) => {
    if (svc.port === 8082) return;
    checks.push({
      name: `${svc.name} /api/ping (${svc.port})`,
      run: async () => {
        const res = await requestWithTimeout({ url: `http://localhost:${svc.port}/api/ping` });
        const pass = res.ok && [200, 304, 400, 401].includes(res.status);
        return {
          pass,
          detail: pass ? `HTTP ${res.status}` : res.ok ? `HTTP ${res.status}` : res.error,
        };
      },
    });
  });

  checks.push({
    name: 'auth /api/users/login (7001)',
    run: async () => {
      const res = await requestWithTimeout({
        method: 'POST',
        url: 'http://localhost:7001/api/users/login',
        body: { email: 'user2026@cppeurope.net', password: 'user2026!' },
      });
      // 403/404 = route OK (mot de passe ou user absent), typique après volume DB vierge.
      const pass = res.ok && [200, 400, 401, 403, 404].includes(res.status);
      return {
        pass,
        detail: pass ? `HTTP ${res.status}` : res.ok ? `HTTP ${res.status}` : res.error,
      };
    },
  });

  return checks;
}

async function main() {
  const services = ensureInventory();
  const checks = buildChecks(services);

  console.log('Precheck e2e: verification des prerequis avant Cypress...');

  const results = [];
  for (const check of checks) {
    const result = await checkWithRetries(() => check.run(), 3, 1200);
    results.push({ name: check.name, ...result });
    const icon = result.pass ? 'OK' : 'KO';
    console.log(`${icon} - ${check.name}: ${result.detail} (tentatives: ${result.attempts})`);
  }

  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.error(`\nPrecheck e2e KO: ${failed.length} verification(s) en echec. Cypress n'est pas lance.`);
    console.error('Rappel: demarrer/reparer les services, puis relancer `npm run cypress:run:guarded`.');
    process.exit(2);
  }

  console.log('\nPrecheck e2e OK: toutes les conditions sont reunies.');
  process.exit(0);
}

main().catch((err) => {
  console.error(`Precheck e2e error: ${err.message}`);
  process.exit(1);
});
