/**
 * Attente des services listés dans services-inventory.json (mêmes URLs que precheck-e2e.js).
 * Utilisé par start+cypress-e2e.sh pour éviter de dupliquer ports/URLs en dur dans le shell.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');

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

function requestHttp({ method = 'GET', url, body, timeoutMs = 2500 }) {
  return new Promise((resolve) => {
    const target = new URL(url);
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
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
        res.resume();
        resolve({ ok: true, status: res.statusCode });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'timeout' });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message || 'error' }));
    if (payload) req.write(payload);
    req.end();
  });
}

function getDefaultHost() {
  return process.env.E2E_BACKEND_HOST || '127.0.0.1';
}

function getPrimaryIPv4() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n && n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return null;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function getServiceHosts(service) {
  if (service && service.host) return [service.host];
  return unique([getDefaultHost(), '127.0.0.1', 'localhost', getPrimaryIPv4()]);
}

function getFrontendService(services) {
  return services.find((s) => typeof s?.name === 'string' && s.name.toLowerCase().includes('frontend'));
}

function getBackendServices(services) {
  const frontend = getFrontendService(services);
  return services.filter((s) => s !== frontend);
}

async function checkFrontend(frontendService) {
  const port = Number(frontendService?.port || 8082);
  const healthPath = frontendService?.healthPath || '/';
  for (const host of getServiceHosts(frontendService)) {
    const res = await requestGet(`http://${host}:${port}${healthPath}`);
    if (res.ok && [200, 304].includes(res.status)) return { ok: true, host };
  }
  return { ok: false };
}

async function checkPing(service) {
  const port = Number(service?.healthPort || service?.port);
  const healthPath = service?.healthPath || '/api/ping';
  const method = (service?.healthMethod || 'GET').toUpperCase();
  const body = service?.healthBody;
  for (const host of getServiceHosts(service)) {
    const res = await requestHttp({
      method,
      url: `http://${host}:${port}${healthPath}`,
      body,
    });
    if (res.ok && [200, 304, 400, 401].includes(res.status)) return { ok: true, host };
  }
  return { ok: false };
}

async function main() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    console.error(`Fichier introuvable: ${INVENTORY_PATH}`);
    process.exit(1);
  }
  const services = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  const frontend = getFrontendService(services) || { name: 'frontend (hostinger)', port: 8082 };
  const backends = getBackendServices(services);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const failed = [];
    const frontCheck = await checkFrontend(frontend);
    if (!frontCheck.ok) {
      failed.push(`${frontend.name} (${(getServiceHosts(frontend) || []).join('|')}:${frontend.port || 8082})`);
    }
    for (const s of backends) {
      const ping = await checkPing(s);
      if (!ping.ok) failed.push(`${s.name} (${(getServiceHosts(s) || []).join('|')}:${s.port})`);
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
