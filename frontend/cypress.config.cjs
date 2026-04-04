// File: cypress.config.cjs
process.env.NODE_OPTIONS = "";
const { defineConfig } = require('cypress');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { buildMultipartFileField } = require('./cypress/support/multipartUpload');

const FRONTEND_PROD_PING = 'http://127.0.0.1:8082/api/ping';

function httpPingOk(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        res.resume();
        resolve(res.statusCode === 200);
      })
      .on('error', () => resolve(false));
  });
}

function postMultipartBuffer({ port, urlPath, token, boundary, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ status: res.statusCode, body: data });
          } else {
            reject(new Error(`HTTP ${res.statusCode} ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = defineConfig({
  allowCypressEnv: false,
  e2e: {
    baseUrl: 'http://localhost:8082',
    supportFile: 'cypress/support/e2e.js',
    // Ré-exécution automatique des specs instables (infra / réseau) — 1 retry = 2 tentatives max
    retries: { runMode: 1, openMode: 0 },
    specPattern: 'cypress/e2e/**/*.cy.js',
    viewportWidth: 1280,
    viewportHeight: 720,
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
         * S’assure que le frontend hostinger répond sur 8082 avec /api/ping (Express server.prod.js).
         * Lance un build si nécessaire, puis démarre le serveur en arrière-plan si le port est vide.
         */
        async ensureFrontendProd8082() {
          const frontendRoot = path.resolve(__dirname);
          const buildIndex = path.join(frontendRoot, 'build', 'index.html');
          const serverProd = path.join(frontendRoot, 'server.prod.js');
          if (!fs.existsSync(serverProd)) {
            throw new Error('server.prod.js introuvable dans ce projet frontend.');
          }
          if (!fs.existsSync(buildIndex)) {
            const r = spawnSync('npm', ['run', 'build'], {
              cwd: frontendRoot,
              stdio: 'inherit',
              shell: true,
            });
            if (r.status !== 0) {
              throw new Error('npm run build a échoué (requis pour server.prod.js).');
            }
          }
          if (await httpPingOk(FRONTEND_PROD_PING)) {
            return 'already-up';
          }
          const child = spawn('node', ['server.prod.js'], {
            cwd: frontendRoot,
            env: { ...process.env, PORT: '8082' },
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
            'Le frontend sur le port 8082 (server.prod.js) ne répond pas à /api/ping après démarrage automatique.'
          );
        },
        /** Upload multipart fiable (Buffer) — évite la corruption binaire de cy.request sur gros fichiers. */
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
          const buf = fs.readFileSync(abs);
          const boundary = `cypress_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
          const body = buildMultipartFileField(boundary, fieldName, fileName, mimeType, buf, {
            messageId: String(messageId),
          });
          await postMultipartBuffer({ port, urlPath: apiPath, token, boundary, body });
          return null;
        },
      });
      return config;
    },
  },
});
