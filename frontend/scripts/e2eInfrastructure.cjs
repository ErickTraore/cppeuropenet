/**
 * Prérequis E2E : une seule logique pour precheck-e2e.js et la tâche Cypress assertE2EInfrastructure.
 * - Attente bornée (démarrage Docker froid).
 * - Empreinte HTTP sur le front : /api/ping doit renvoyer du JSON { status: 'ok' } (pas un autre processus sur 8082).
 * - En échec : diagnostic lsof sur le port concerné (darwin/linux).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const os = require('os');
const { execSync } = require('child_process');

const INVENTORY_PATH = path.resolve(__dirname, '../services-inventory.json');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestWithTimeout({ method = 'GET', url, body, timeoutMs = 4000 }) {
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

function loadInventory() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    throw new Error(`Fichier introuvable: ${INVENTORY_PATH}`);
  }
  return JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf-8'));
}

function findServiceByName(services, matcher) {
  return services.find((s) => typeof s?.name === 'string' && matcher(s.name.toLowerCase()));
}

function resolveHost(service, fallbackHost = '127.0.0.1') {
  return (service && service.host) || fallbackHost;
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

function uniqueHosts(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function hostCandidates(explicitHost, fallbackHost = '127.0.0.1') {
  if (explicitHost) return [explicitHost];
  return uniqueHosts([fallbackHost, '127.0.0.1', 'localhost', getPrimaryIPv4()]);
}

async function checkAcrossHosts(hosts, port, pathName, validator) {
  for (const host of hosts) {
    const res = await requestWithTimeout({ url: `http://${host}:${port}${pathName}` });
    if (validator(res)) return { pass: true, host, res };
  }
  return { pass: false };
}

async function checkAcrossHostsWithRequest(hosts, requestFactory, validator) {
  for (const host of hosts) {
    const res = await requestWithTimeout(requestFactory(host));
    if (validator(res)) return { pass: true, host, res };
  }
  return { pass: false };
}

/** Qui écoute sur ce port (127.0.0.1 / *), pour expliquer ECONNRESET / mauvais service. */
function lsofListeners(port) {
  if (!port || typeof port !== 'number') return '';
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true`, {
      encoding: 'utf8',
      maxBuffer: 256 * 1024,
    });
    return (out || '').trim();
  } catch {
    return '(lsof indisponible)';
  }
}

/**
 * @param {object} opts
 * @param {number} opts.frontPort
 * @param {number} opts.userPort
 */
function buildChecks(services, opts) {
  const { frontPort, userPort, frontHost, userHost, defaultBackendHost } = opts;
  const checks = [];

  checks.push({
    name: `frontend /api/ping JSON (Express) (${frontPort})`,
    port: frontPort,
    run: async () => {
      const hosts = hostCandidates(frontHost, defaultBackendHost);
      const found = await checkAcrossHosts(hosts, frontPort, '/api/ping', (res) => {
        if (!res.ok || res.status !== 200) return false;
        try {
          const j = JSON.parse(res.body || '{}');
          return !!(j && j.status === 'ok');
        } catch {
          return false;
        }
      });
      if (found.pass) return { pass: true, detail: `HTTP 200 JSON ok via ${found.host}` };
      return {
        pass: false,
        detail: `aucune réponse valide sur /api/ping via ${hosts.join('|')} (attendu 200 + JSON { status: 'ok' })`,
      };
    },
  });

  services.forEach((svc) => {
    if (svc.port === frontPort) return;
    const svcName = String(svc.name || '').toLowerCase();
    if (svcName.includes('home-config')) {
      checks.push({
        name: `${svc.name} via frontend /api/home-config (${frontPort})`,
        port: frontPort,
        run: async () => {
          const hosts = hostCandidates(frontHost, defaultBackendHost);
          const found = await checkAcrossHosts(hosts, frontPort, '/api/home-config', (res) => {
            if (!res.ok || res.status !== 200) return false;
            try {
              const j = JSON.parse(res.body || '{}');
              return Array.isArray(j?.categories) && j.categories.length === 3;
            } catch {
              return false;
            }
          });
          if (found.pass) {
            return { pass: true, detail: `HTTP 200 via ${found.host}` };
          }
          return {
            pass: false,
            detail: `aucune réponse valide via frontend /api/home-config sur ${hosts.join('|')}`,
          };
        },
      });
      return;
    }
    const checkPort = Number(svc.healthPort || svc.port);
    const svcHost = resolveHost(svc, defaultBackendHost);
    const healthPath = svc.healthPath || '/api/ping';
    checks.push({
      name: `${svc.name} ${healthPath} (${svcHost}:${checkPort})`,
      port: checkPort,
      run: async () => {
        const hosts = hostCandidates(svc.host || null, defaultBackendHost);
        const method = (svc.healthMethod || 'GET').toUpperCase();
        const body = svc.healthBody;
        const found = await checkAcrossHostsWithRequest(
          hosts,
          (host) => ({
            method,
            url: `http://${host}:${checkPort}${healthPath}`,
            body,
          }),
          (res) => {
          return res.ok && [200, 304, 400, 401].includes(res.status);
          }
        );
        const pass = found.pass;
        return {
          pass,
          detail: pass ? `HTTP ${found.res.status} via ${found.host}` : `aucune réponse valide via ${hosts.join('|')}`,
        };
      },
    });
  });

  checks.push({
    name: `auth POST /api/users/login (${userPort})`,
    port: userPort,
    run: async () => {
      const hosts = hostCandidates(userHost, defaultBackendHost);
      const payload = { email: 'user2026@cppeurope.net', password: 'user2026!' };
      for (const host of hosts) {
        const loginRes = await requestWithTimeout({
          method: 'POST',
          url: `http://${host}:${userPort}/api/users/login`,
          body: payload,
        });

        if (loginRes.ok && [200, 400, 401, 403].includes(loginRes.status)) {
          return { pass: true, detail: `HTTP ${loginRes.status} via ${host} (login)` };
        }

        const registerRes = await requestWithTimeout({
          method: 'POST',
          url: `http://${host}:${userPort}/api/users/register/`,
          body: payload,
        });
        if (registerRes.ok && [200, 400, 401, 403, 409].includes(registerRes.status)) {
          return { pass: true, detail: `HTTP ${registerRes.status} via ${host} (register)` };
        }
      }
      return {
        pass: false,
        detail: `aucune réponse auth valide via ${hosts.join('|')}`,
      };
    },
  });

  return checks;
}

function formatFailureReport(failures, checks) {
  const lines = failures.map((f) => {
    const check = checks.find((c) => c.name === f.name);
    const lsof = check && check.port != null ? lsofListeners(check.port) : '';
    const extra = lsof ? `\n    lsof -iTCP:${check.port} -sTCP:LISTEN:\n${lsof.split('\n').map((l) => `      ${l}`).join('\n')}` : '';
    return `  • ${f.name}\n    → ${f.detail}${extra}`;
  });
  return lines.join('\n\n');
}

/**
 * Boucle jusqu’à ce que tous les checks passent ou maxWaitMs dépassé.
 */
async function runInfrastructureGate(options = {}) {
  const services = loadInventory();
  const frontendService = findServiceByName(services, (n) => n.includes('frontend')) || {};
  const userBackendService =
    findServiceByName(services, (n) => n.includes('user-backend')) || {};

  const defaultBackendHost = process.env.E2E_BACKEND_HOST || (process.platform === 'darwin' ? 'localhost' : '127.0.0.1');
  const frontHost =
    options.frontHost != null
      ? String(options.frontHost)
      :
          process.env.CYPRESS_FRONTEND_HOST ||
          process.env.HOSTINGER_FRONTEND_HOST ||
          process.env.E2E_FRONTEND_HOST ||
          frontendService.host ||
          defaultBackendHost;
  const userHost =
    options.userHost != null
      ? String(options.userHost)
      :
          process.env.CYPRESS_USER_BACKEND_HOST ||
          process.env.HOSTINGER_USER_BACKEND_HOST ||
          userBackendService.host ||
          defaultBackendHost;

  const frontPort =
    options.frontPort != null
      ? parseInt(String(options.frontPort), 10)
      : parseInt(
          process.env.HOSTINGER_FRONTEND_PORT || String(frontendService.port || 8082),
          10,
        );
  const userPort =
    options.userPort != null
      ? parseInt(String(options.userPort), 10)
      : parseInt(
          process.env.HOSTINGER_USER_BACKEND_PORT || String(userBackendService.healthPort || userBackendService.port || 7001),
          10,
        );
  const maxWaitMs = options.maxWaitMs != null ? options.maxWaitMs : 180000;
  const pollMs = options.pollMs != null ? options.pollMs : 2000;
  const quietProgress = options.quietProgress === true;
  const progressPrefix =
    options.progressPrefix != null ? String(options.progressPrefix) : 'Precheck';
  const progressLogMsRaw =
    options.progressLogMs != null
      ? parseInt(String(options.progressLogMs), 10)
      : parseInt(process.env.E2E_PRECHECK_PROGRESS_MS || '8000', 10);
  const progressLogMs = Number.isFinite(progressLogMsRaw) && progressLogMsRaw > 0 ? progressLogMsRaw : 8000;

  const checks = buildChecks(services, {
    frontPort,
    userPort,
    frontHost,
    userHost,
    defaultBackendHost,
  });
  const deadline = Date.now() + maxWaitMs;
  const startedAt = Date.now();
  let lastFailures = [];
  let lastProgressLogAt = 0;

  while (Date.now() < deadline) {
    lastFailures = [];
    let allOk = true;
    for (const check of checks) {
      const r = await check.run();
      if (!r.pass) {
        allOk = false;
        lastFailures.push({ name: check.name, detail: r.detail });
      }
    }
    if (allOk) {
      return { ok: true, frontPort, userPort, checksRun: checks.length };
    }

    if (!quietProgress) {
      const now = Date.now();
      const firstWait = lastProgressLogAt === 0;
      const intervalElapsed = now - lastProgressLogAt >= progressLogMs;
      if (firstWait || intervalElapsed) {
        lastProgressLogAt = now;
        const elapsedSec = Math.round((now - startedAt) / 1000);
        const remainingSec = Math.max(0, Math.round((deadline - now) / 1000));
        const shortNames = lastFailures.map((f) => {
          const n = f.name;
          const cut = n.indexOf(' (');
          return cut > 0 ? n.slice(0, cut) : n;
        });
        const shown = shortNames.slice(0, 5);
        const extra = shortNames.length > 5 ? ` … +${shortNames.length - 5}` : '';
        console.log(
          `[${progressPrefix}] En cours — ${elapsedSec}s écoulées, encore jusqu'à ~${remainingSec}s. Pas prêt: ${shown.join(' · ')}${extra}`,
        );
      }
    }

    await sleep(pollMs);
  }

  const report = formatFailureReport(lastFailures, checks);
  throw new Error(
    `Infrastructure E2E non prête après ${maxWaitMs} ms (HOSTINGER_FRONTEND=${frontHost}:${frontPort}, HOSTINGER_USER_BACKEND=${userHost}:${userPort}).\n` +
      `Démarrer les stacks Docker (Hostinger + Contabo) et vérifier qu’aucun autre programme n’occupe ces ports.\n\n` +
      report
  );
}

module.exports = {
  loadInventory,
  buildChecks,
  requestWithTimeout,
  runInfrastructureGate,
  lsofListeners,
};
