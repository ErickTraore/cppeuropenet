// File: cypress.config.cjs
process.env.NODE_OPTIONS = "";
const { defineConfig } = require('cypress');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { runInfrastructureGate } = require('./scripts/e2eInfrastructure.cjs');

function firstNonInternalIPv4() {
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n && n.family === 'IPv4' && !n.internal) return n.address;
    }
  }
  return null;
}

const { E2E_ENV } = require('./cypress/support/e2eServiceEndpoints.cjs');

function normalizeBasePath(input) {
  const raw = String(input || '').trim();
  if (!raw || raw === '/') return '';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

const LOCAL_FRONT_PORT = parseInt(process.env.HOSTINGER_FRONTEND_PORT || '8082', 10);
const configuredFrontHost = process.env.HOSTINGER_FRONTEND_HOST || process.env.E2E_FRONTEND_HOST || '';
const primaryIPv4 = firstNonInternalIPv4();
const normalizedConfiguredFrontHost = String(configuredFrontHost || '').trim();
const useLanFallbackForLocalhost =
  process.platform === 'darwin' &&
  (normalizedConfiguredFrontHost === '' ||
    normalizedConfiguredFrontHost === 'localhost' ||
    normalizedConfiguredFrontHost === '127.0.0.1');
const CYPRESS_FRONTEND_HOST = useLanFallbackForLocalhost
  ? primaryIPv4 || 'localhost'
  : normalizedConfiguredFrontHost;
const FRONT_BASE_PATH = normalizeBasePath(
  process.env.HOSTINGER_FRONTEND_BASE_PATH || process.env.E2E_FRONTEND_BASE_PATH || ''
);
const LOCAL_USER_PORT = parseInt(
  process.env.HOSTINGER_USER_BACKEND_PORT || E2E_ENV.E2E_PORT_USER_BACKEND || '17001',
  10
);
const configuredUserHost =
  process.env.HOSTINGER_USER_BACKEND_HOST || process.env.E2E_BACKEND_HOST || process.env.HOSTINGER_FRONTEND_HOST || '';
const CYPRESS_USER_BACKEND_HOST =
  process.platform === 'darwin' && (configuredUserHost === '' || configuredUserHost === 'localhost' || configuredUserHost === '127.0.0.1')
    ? 'localhost'
    : configuredUserHost || '127.0.0.1';
const HOME_CONFIG_BASELINE_FILE = path.join(__dirname, 'cypress', '.e2e-home-config-baseline.json');

function frontHostCandidates() {
  const explicit = process.env.CYPRESS_FRONTEND_HOST || process.env.HOSTINGER_FRONTEND_HOST || process.env.E2E_FRONTEND_HOST || null;
  const candidates = [explicit, 'localhost', '127.0.0.1', firstNonInternalIPv4()]
    .filter(Boolean)
    .map((h) => String(h));
  return [...new Set(candidates)];
}

function frontProtocol() {
  return LOCAL_FRONT_PORT === 443 ? 'https' : 'http';
}

function frontPingUrl(host) {
  return `${frontProtocol()}://${host}:${LOCAL_FRONT_PORT}${FRONT_BASE_PATH}/api/ping`;
}

function frontApiUrl(host, apiPath) {
  const pathOnly = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `${frontProtocol()}://${host}:${LOCAL_FRONT_PORT}${FRONT_BASE_PATH}${pathOnly}`;
}

function signHs256Jwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${enc(header)}.${enc(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${sig}`;
}

/** JSON HTTP (Node) pour login + PUT home-config — teardown fiable hors navigateur. */
function httpJsonRequest(urlStr, { method = 'GET', headers = {}, jsonBody = null, timeoutMs = 10000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? require('https') : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: `${u.pathname}${u.search}`,
      method,
      headers: { ...headers },
    };
    let payload = null;
    if (jsonBody != null) {
      payload = JSON.stringify(jsonBody);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(payload, 'utf8');
    }
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        let body = raw;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          /* texte */
        }
        if (ok) resolve({ status: res.statusCode, body });
        else reject(new Error(`HTTP ${res.statusCode} ${raw.slice(0, 200)}`));
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`HTTP timeout after ${timeoutMs}ms (${method} ${u.pathname})`));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function retryAsync(fn, { attempts = 6, delayMs = 1500 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn(i + 1);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  throw lastErr;
}

/** True si le front est bien server.prod.js (JSON { status: 'ok' }), pas un SPA statique qui renvoie index.html en 200. */
function httpPingOk(url) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https://') ? https : http;
    const req = lib.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode !== 200) {
          resolve(false);
          return;
        }
        try {
          const j = JSON.parse(raw);
          resolve(j && j.status === 'ok');
        } catch {
          resolve(false);
        }
      });
    });
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function frontPingOkAnyHost() {
  for (const host of frontHostCandidates()) {
    if (await httpPingOk(frontPingUrl(host))) return { ok: true, host };
  }
  return { ok: false, host: null };
}

module.exports = defineConfig({
  allowCypressEnv: true,
  e2e: {
    // Evite les timeouts intermittents de resolution localhost sous Electron en preferant l'IPv4 de la machine.
    baseUrl: `http://${CYPRESS_FRONTEND_HOST}:${LOCAL_FRONT_PORT}${FRONT_BASE_PATH}`,
    supportFile: 'cypress/support/e2e.js',
    // Ré-exécution automatique des specs instables (infra / réseau) — 1 retry = 2 tentatives max
    retries: { runMode: 1, openMode: 0 },
    specPattern: 'cypress/e2e/**/*.cy.js',
    viewportWidth: 1280,
    viewportHeight: 720,
    /** Après reboot / Docker froid, les cy.request vers les backends peuvent dépasser 30s. */
    requestTimeout: 60000,
    defaultCommandTimeout: 15000,
    /** Chemins réseau imposés pour les specs (copie de cypress/support/e2eServiceEndpoints.cjs). */
    env: { ...E2E_ENV },
    /** Build + démarrage server.prod.js depuis une tâche (voir ensureFrontendProd8082). */
    taskTimeout: 300000,
    // Ensure browser console logs are printed to the terminal to aid debugging
    browserConsoleLogOptions: {
      logLevels: ['error', 'warn'],
      terminal: true,
    },
    setupNodeEvents(on, config) {
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        checkServerDev() {
          const serverDevPath = path.resolve(__dirname, 'server.dev.js');
          return fs.existsSync(serverDevPath);
        },
        signE2EAccessToken({ userId = 1, isAdmin = true, ttlSec = 1800, secret } = {}) {
          const signSecret =
            String(secret || '').trim() || process.env.CYPRESS_E2E_SIGN_SECRET || process.env.JWT_SIGN_SECRET;
          if (!signSecret) {
            throw new Error('Missing JWT sign secret for signE2EAccessToken task.');
          }
          const now = Math.floor(Date.now() / 1000);
          return signHs256Jwt({ userId, isAdmin, iat: now, exp: now + ttlSec }, signSecret);
        },
        /**
         * S’assure que le frontend hostinger répond sur le port HOSTINGER_FRONTEND_PORT (défaut 8082) avec /api/ping (Express server.prod.js).
         * Lance un build si nécessaire, puis démarre le serveur en arrière-plan si le port est vide.
         */
        async ensureFrontendProd8082() {
          if (String(process.env.CYPRESS_SKIP_E2E_READY_CHECKS || '').trim() === '1') {
            return 'skipped-by-env';
          }
          const frontendRoot = path.resolve(__dirname);
          const serverProd = path.join(frontendRoot, 'server.prod.js');
          if (!fs.existsSync(serverProd)) {
            throw new Error('server.prod.js introuvable dans ce projet frontend.');
          }
          const ensureBuild = path.join(frontendRoot, 'scripts', 'e2e-ensure-build.cjs');
          const r = spawnSync(process.execPath, [ensureBuild], {
            cwd: frontendRoot,
            stdio: 'inherit',
          });
          if (r.status !== 0) {
            throw new Error('e2e-ensure-build a échoué (sync .env + build alignés sur e2eServiceEndpoints.cjs).');
          }
          const upBefore = await frontPingOkAnyHost();
          if (upBefore.ok) {
            return 'already-up';
          }
          const child = spawn('node', ['server.prod.js'], {
            cwd: frontendRoot,
            env: { ...process.env, PORT: String(LOCAL_FRONT_PORT) },
            detached: true,
            stdio: 'ignore',
          });
          child.unref();
          const deadline = Date.now() + 60000;
          while (Date.now() < deadline) {
            await new Promise((r) => setTimeout(r, 400));
            const upAfter = await frontPingOkAnyHost();
            if (upAfter.ok) {
              return 'started';
            }
          }
          throw new Error(
            `Le frontend sur le port ${LOCAL_FRONT_PORT} (server.prod.js) ne répond pas à /api/ping après démarrage automatique (hôtes testés: ${frontHostCandidates().join(', ')}).`
          );
        },
        /**
         * Barrière d’infra : attente bornée + /api/ping JSON sur le front + tous les /api/ping inventaire + login test.
         * Échec avec lsof sur les ports concernés (conflit IDE / autre service).
         */
        async assertE2EInfrastructure() {
          if (String(process.env.CYPRESS_SKIP_E2E_INFRA_GATE || '').trim() === '1') {
            return 'e2e-gate-skipped';
          }
          const maxMs = parseInt(process.env.CYPRESS_E2E_GATE_MAX_MS || '180000', 10);
          const pollMs = parseInt(process.env.CYPRESS_E2E_GATE_POLL_MS || '2000', 10);
          await runInfrastructureGate({
            frontPort: LOCAL_FRONT_PORT,
            userPort: LOCAL_USER_PORT,
            frontHost: CYPRESS_FRONTEND_HOST,
            userHost: CYPRESS_USER_BACKEND_HOST,
            maxWaitMs: maxMs,
            pollMs,
            progressPrefix: 'E2E gate (Cypress)',
          });
          return 'e2e-ready';
        },
        async checkFrontPing() {
          const url = frontApiUrl(CYPRESS_FRONTEND_HOST, '/api/ping');
          const { status, body } = await httpJsonRequest(url, { method: 'GET', timeoutMs: 8000 });
          if (status !== 200 || !body || body.status !== 'ok') {
            throw new Error(`Frontend ping invalide (${status})`);
          }
          return 'ok';
        },
        async checkHomeConfigViaFront() {
          const url = frontApiUrl(CYPRESS_FRONTEND_HOST, '/api/home-config');
          const attempts = 20;
          for (let i = 1; i <= attempts; i += 1) {
            try {
              const { status, body } = await httpJsonRequest(url, { method: 'GET', timeoutMs: 8000 });
              if (status === 200 && Array.isArray(body?.categories) && body.categories.length === 3) {
                return 'ok';
              }
            } catch {
              // keep retrying while backend stack finishes booting
            }
            await new Promise((r) => setTimeout(r, 1500));
          }
          throw new Error('home-config indisponible via front après retries');
        },
        async loginByApiNode({
          email,
          password,
          timeoutMs = 12000,
          attempts = 6,
          delayMs = 1500,
        } = {}) {
          if (!email || !password) {
            throw new Error('loginByApiNode requires email and password.');
          }
          const doLogin = async () => {
            const { status, body } = await httpJsonRequest(frontApiUrl(CYPRESS_FRONTEND_HOST, '/api/users/login'), {
              method: 'POST',
              jsonBody: { email, password },
              timeoutMs,
            });
            if (status !== 200 || !body || !body.accessToken) {
              throw new Error(`loginByApiNode invalid response status=${status}`);
            }
            return body.accessToken;
          };
          return retryAsync(doLogin, { attempts, delayMs });
        },
        /** Upload multipart fiable (Buffer) — évite la corruption binaire de cy.request sur gros fichiers. */
        writeHomeConfigBaselineFile({ baseline }) {
          fs.writeFileSync(HOME_CONFIG_BASELINE_FILE, JSON.stringify(baseline, null, 2), 'utf8');
          return 'baseline-written';
        },
        /**
         * Restaure GET/PUT home-config depuis le fichier baseline (spec 042).
         * Côté Node : plus fiable que cy.request dans after si Open est fermé brutalement.
         */
        async restoreHomeConfigBaseline({ baseUrl, adminEmail, adminPassword }) {
          if (!fs.existsSync(HOME_CONFIG_BASELINE_FILE)) {
            console.warn('[cypress task] Pas de fichier baseline, restauration ignorée.');
            return 'skip-no-file';
          }
          let baseline;
          try {
            baseline = JSON.parse(fs.readFileSync(HOME_CONFIG_BASELINE_FILE, 'utf8'));
          } catch (e) {
            throw new Error(`Baseline JSON invalide: ${e.message}`);
          }
          const normalizedBaseUrl = String(baseUrl || process.env.CYPRESS_BASE_URL || '').replace(/\/$/, '');
          const envHomeConfigOrigin = String(process.env.CYPRESS_HOME_CONFIG_ORIGIN || '').trim();
          const envHomeConfigIsLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(envHomeConfigOrigin);
          let baseUrlIsRemote = false;
          try {
            const baseHost = new URL(normalizedBaseUrl).hostname;
            baseUrlIsRemote = !!baseHost && baseHost !== 'localhost' && baseHost !== '127.0.0.1';
          } catch {
            baseUrlIsRemote = false;
          }
          const selectedOrigin =
            envHomeConfigOrigin && !(baseUrlIsRemote && envHomeConfigIsLocal)
              ? envHomeConfigOrigin
              : normalizedBaseUrl;
          const apiOrigin = selectedOrigin || `http://127.0.0.1:${LOCAL_USER_PORT}`;
          const loginUrl = `${apiOrigin}/api/users/login`;
          const { body: loginBody } = await httpJsonRequest(loginUrl, {
            method: 'POST',
            jsonBody: { email: adminEmail, password: adminPassword },
          });
          const token = loginBody && loginBody.accessToken;
          if (!token) throw new Error('Login admin E2E sans accessToken');
          // Priorite a CYPRESS_HOME_CONFIG_ORIGIN; sinon on repasse par le meme origin que baseUrl.
          const homeConfigBase = selectedOrigin || apiOrigin;
          const putUrl = `${homeConfigBase.replace(/\/$/, '')}/api/home-config`;
          await httpJsonRequest(putUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            jsonBody: {
              heroText: baseline.heroText,
              categories: baseline.categories,
            },
          });
          try {
            fs.unlinkSync(HOME_CONFIG_BASELINE_FILE);
          } catch {
            /* ok */
          }
          console.log('[cypress task] Home-config restaurée depuis baseline E2E.');
          return 'restored';
        },
        async restoreHomeConfigBaselineSafe(args) {
          try {
            const result = await this.restoreHomeConfigBaseline(args);
            return { ok: true, result };
          } catch (err) {
            return {
              ok: false,
              error: err && err.message ? err.message : String(err),
            };
          }
        },
        async uploadHomeConfigImageCurl({
          baseUrl,
          fixtureRelativePath,
          mimeType = 'image/png',
          tokenSecret = process.env.CYPRESS_HOME_CONFIG_JWT_SIGN_SECRET || '0f9f8e9d8c7b6a5z4e3r2t1y0u',
          userId = 2,
          isAdmin = true,
        } = {}) {
          if (!baseUrl) throw new Error('uploadHomeConfigImageCurl: baseUrl requis');
          if (!fixtureRelativePath) throw new Error('uploadHomeConfigImageCurl: fixtureRelativePath requis');

          const root = path.resolve(__dirname);
          const abs = path.join(root, fixtureRelativePath);
          if (!fs.existsSync(abs)) {
            throw new Error(`Fixture introuvable: ${fixtureRelativePath}`);
          }

          const now = Math.floor(Date.now() / 1000);
          const token = signHs256Jwt(
            { userId: Number(userId), isAdmin: !!isAdmin, iat: now, exp: now + 3600 },
            String(tokenSecret)
          );

          const uploadUrl = `${String(baseUrl).replace(/\/$/, '')}/api/home-config/upload`;
          const tmpOut = path.join(os.tmpdir(), `cypress-home-upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.json`);
          try {
            const r = spawnSync(
              'curl',
              [
                '-sS',
                '-m',
                '120',
                '-o',
                tmpOut,
                '-w',
                '%{http_code}',
                '-X',
                'POST',
                uploadUrl,
                '-H',
                `Authorization: Bearer ${token}`,
                '-F',
                `image=@${abs};type=${mimeType}`,
              ],
              { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }
            );
            if (r.error) throw r.error;

            const httpCode = parseInt((r.stdout || '').trim(), 10);
            const raw = (() => {
              try {
                return fs.readFileSync(tmpOut, 'utf8');
              } catch {
                return '';
              }
            })();

            if (r.status !== 0) {
              throw new Error(`curl upload home-config exit ${r.status}: ${(r.stderr || '').trim()} ${raw.slice(0, 300)}`);
            }
            if (!Number.isFinite(httpCode) || httpCode < 200 || httpCode >= 300) {
              throw new Error(`upload home-config HTTP ${httpCode}: ${raw.slice(0, 300)}`);
            }

            const body = raw ? JSON.parse(raw) : null;
            if (!body || typeof body.url !== 'string' || !body.url) {
              throw new Error(`upload home-config response invalide: ${raw.slice(0, 300)}`);
            }
            return { url: body.url };
          } finally {
            try {
              fs.unlinkSync(tmpOut);
            } catch {
              /* ok */
            }
          }
        },
        async presseMediaUpload(opts) {
          const {
            token,
            messageId,
            format,
            fieldName,
            fileName,
            mimeType,
            fixtureRelativePath,
            port,
            apiPath,
          } = opts;
          const root = path.resolve(__dirname);
          const abs = path.join(root, fixtureRelativePath);
          if (!fs.existsSync(abs)) {
            throw new Error(`Fixture introuvable: ${fixtureRelativePath}`);
          }
          const pathOnly = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
          const url = `http://127.0.0.1:${port}${pathOnly}`;
          const formField = `${fieldName}=@${abs};filename=${fileName}${mimeType ? `;type=${mimeType}` : ''}`;
          const tmpOut = path.join(os.tmpdir(), `cypress-upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}.bin`);
          try {
            const r = spawnSync(
              'curl',
              [
                '-sS',
                '-m',
                '300',
                '-o',
                tmpOut,
                '-w',
                '%{http_code}',
                '-X',
                'POST',
                url,
                '-H',
                `Authorization: Bearer ${token}`,
                '-F',
                `messageId=${String(messageId)}`,
                ...(format ? ['-F', `format=${String(format)}`] : []),
                '-F',
                formField,
              ],
              { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }
            );
            if (r.error) throw r.error;
            const httpCode = parseInt((r.stdout || '').trim(), 10);
            const errBody = (() => {
              try {
                return fs.readFileSync(tmpOut, 'utf8').slice(0, 800);
              } catch {
                return '';
              }
            })();
            if (r.status !== 0) {
              throw new Error(`curl upload exit ${r.status}: ${(r.stderr || '').trim()} ${errBody}`);
            }
            if (!Number.isFinite(httpCode) || httpCode < 200 || httpCode >= 300) {
              throw new Error(`upload HTTP ${httpCode}: ${errBody}`);
            }
          } finally {
            try {
              fs.unlinkSync(tmpOut);
            } catch {
              /* ok */
            }
          }
          return null;
        },
      });
      return config;
    },
  },
});
