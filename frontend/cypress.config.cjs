// File: cypress.config.cjs
process.env.NODE_OPTIONS = "";
const { defineConfig } = require('cypress');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, spawnSync } = require('child_process');
const { runInfrastructureGate } = require('./scripts/e2eInfrastructure.cjs');
const { E2E_ENV } = require('./cypress/support/e2eServiceEndpoints.cjs');

const LOCAL_FRONT_PORT = parseInt(process.env.HOSTINGER_FRONTEND_PORT || '8082', 10);
const LOCAL_USER_PORT = parseInt(process.env.HOSTINGER_USER_BACKEND_PORT || '7001', 10);
const FRONTEND_PROD_PING = `http://127.0.0.1:${LOCAL_FRONT_PORT}/api/ping`;
const HOME_CONFIG_BASELINE_FILE = path.join(__dirname, 'cypress', '.e2e-home-config-baseline.json');

/** JSON HTTP (Node) pour login + PUT home-config — teardown fiable hors navigateur. */
function httpJsonRequest(urlStr, { method = 'GET', headers = {}, jsonBody = null } = {}) {
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
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** True si le front est bien server.prod.js (JSON { status: 'ok' }), pas un SPA statique qui renvoie index.html en 200. */
function httpPingOk(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
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
      })
      .on('error', () => resolve(false));
  });
}

module.exports = defineConfig({
  allowCypressEnv: false,
  e2e: {
    // 127.0.0.1 évite qu’un autre service sur la machine écoute « localhost » (ex. outil IDE) et réponde à la place du proxy Express.
    baseUrl: `http://127.0.0.1:${LOCAL_FRONT_PORT}`,
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
        /**
         * S’assure que le frontend hostinger répond sur le port HOSTINGER_FRONTEND_PORT (défaut 8082) avec /api/ping (Express server.prod.js).
         * Lance un build si nécessaire, puis démarre le serveur en arrière-plan si le port est vide.
         */
        async ensureFrontendProd8082() {
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
          if (await httpPingOk(FRONTEND_PROD_PING)) {
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
            if (await httpPingOk(FRONTEND_PROD_PING)) {
              return 'started';
            }
          }
          throw new Error(
            `Le frontend sur le port ${LOCAL_FRONT_PORT} (server.prod.js) ne répond pas à /api/ping après démarrage automatique.`
          );
        },
        /**
         * Barrière d’infra : attente bornée + /api/ping JSON sur le front + tous les /api/ping inventaire + login test.
         * Échec avec lsof sur les ports concernés (conflit IDE / autre service).
         */
        async assertE2EInfrastructure() {
          const maxMs = parseInt(process.env.CYPRESS_E2E_GATE_MAX_MS || '180000', 10);
          const pollMs = parseInt(process.env.CYPRESS_E2E_GATE_POLL_MS || '2000', 10);
          await runInfrastructureGate({
            frontPort: LOCAL_FRONT_PORT,
            userPort: LOCAL_USER_PORT,
            maxWaitMs: maxMs,
            pollMs,
            progressPrefix: 'E2E gate (Cypress)',
          });
          return 'e2e-ready';
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
          const loginUrl = `http://127.0.0.1:${LOCAL_USER_PORT}/api/users/login`;
          const { body: loginBody } = await httpJsonRequest(loginUrl, {
            method: 'POST',
            jsonBody: { email: adminEmail, password: adminPassword },
          });
          const token = loginBody && loginBody.accessToken;
          if (!token) throw new Error('Login admin E2E sans accessToken');
          // PUT direct sur home-config (7020) : évite tout souci de proxy / en-têtes ; JWT doit matcher JWT_SIGN_SECRET du backend home-config.
          const homeConfigBase =
            process.env.CYPRESS_HOME_CONFIG_ORIGIN || 'http://127.0.0.1:7020';
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
        async presseMediaUpload(opts) {
          const {
            token,
            messageId,
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
