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
  const { frontPort, userPort } = opts;
  const checks = [];

  checks.push({
    name: `frontend /api/ping JSON (Express) (${frontPort})`,
    port: frontPort,
    run: async () => {
      const res = await requestWithTimeout({
        url: `http://127.0.0.1:${frontPort}/api/ping`,
      });
      if (!res.ok) {
        return { pass: false, detail: res.error || 'no response' };
      }
      if (res.status !== 200) {
        return { pass: false, detail: `HTTP ${res.status} (attendu 200 + JSON { status: 'ok' })` };
      }
      try {
        const j = JSON.parse(res.body || '{}');
        const pass = j && j.status === 'ok';
        return {
          pass,
          detail: pass ? `HTTP ${res.status} JSON ok` : `corps inattendu: ${(res.body || '').slice(0, 120)}`,
        };
      } catch {
        return {
          pass: false,
          detail: `réponse non-JSON sur /api/ping (autre processus sur le port ${frontPort} ?)`,
        };
      }
    },
  });

  services.forEach((svc) => {
    if (svc.port === frontPort) return;
    checks.push({
      name: `${svc.name} /api/ping (${svc.port})`,
      port: svc.port,
      run: async () => {
        const res = await requestWithTimeout({ url: `http://127.0.0.1:${svc.port}/api/ping` });
        const pass = res.ok && [200, 304, 400, 401].includes(res.status);
        return {
          pass,
          detail: pass ? `HTTP ${res.status}` : res.ok ? `HTTP ${res.status}` : res.error,
        };
      },
    });
  });

  checks.push({
    name: `auth POST /api/users/login (${userPort})`,
    port: userPort,
    run: async () => {
      const res = await requestWithTimeout({
        method: 'POST',
        url: `http://127.0.0.1:${userPort}/api/users/login`,
        body: { email: 'user2026@cppeurope.net', password: 'user2026!' },
      });
      const pass = res.ok && [200, 400, 401, 403, 404].includes(res.status);
      return {
        pass,
        detail: pass ? `HTTP ${res.status}` : res.ok ? `HTTP ${res.status}` : res.error,
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
  const frontPort =
    options.frontPort != null
      ? parseInt(String(options.frontPort), 10)
      : parseInt(process.env.HOSTINGER_FRONTEND_PORT || '8082', 10);
  const userPort =
    options.userPort != null
      ? parseInt(String(options.userPort), 10)
      : parseInt(process.env.HOSTINGER_USER_BACKEND_PORT || '7001', 10);
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

  const services = loadInventory();
  const checks = buildChecks(services, { frontPort, userPort });
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
    `Infrastructure E2E non prête après ${maxWaitMs} ms (HOSTINGER_FRONTEND_PORT=${frontPort}, HOSTINGER_USER_BACKEND_PORT=${userPort}).\n` +
      `Démarrer les stacks Docker (Hostinger + Contabo) et vérifier qu’aucun autre programme n’occupe ces ports sur 127.0.0.1.\n\n` +
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
