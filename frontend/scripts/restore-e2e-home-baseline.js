#!/usr/bin/env node
/**
 * Restaure home-config depuis cypress/.e2e-home-config-baseline.json (spec 042 interrompu).
 * Usage : npm run e2e:restore-home-baseline
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const BASELINE = path.join(__dirname, '..', 'cypress', '.e2e-home-config-baseline.json');
const BASE_URL = process.env.E2E_BASE_URL || 'http://127.0.0.1:8082';
const LOGIN_URL = process.env.E2E_LOGIN_URL || 'http://127.0.0.1:7001/api/users/login';
const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL || 'admin2026@cppeurope.net',
  password: process.env.E2E_ADMIN_PASSWORD || 'admin2026!',
};

function requestJson(url, { method, headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port || 80,
      path: `${u.pathname}${u.search}`,
      method: method || 'GET',
      headers: { ...headers },
    };
    let raw = null;
    if (body != null) {
      raw = JSON.stringify(body);
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(raw, 'utf8');
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        const ok = res.statusCode >= 200 && res.statusCode < 300;
        let parsed = text;
        try {
          parsed = text ? JSON.parse(text) : null;
        } catch {
          /* */
        }
        if (ok) resolve({ status: res.statusCode, body: parsed });
        else reject(new Error(`HTTP ${res.statusCode} ${text.slice(0, 300)}`));
      });
    });
    req.on('error', reject);
    if (raw) req.write(raw);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(BASELINE)) {
    console.error('Aucun fichier baseline :', BASELINE);
    process.exit(1);
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const { body: loginBody } = await requestJson(LOGIN_URL, { method: 'POST', body: ADMIN });
  const token = loginBody && loginBody.accessToken;
  if (!token) throw new Error('Pas de accessToken');
  const putUrl = `${BASE_URL.replace(/\/$/, '')}/api/home-config`;
  await requestJson(putUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: { heroText: baseline.heroText, categories: baseline.categories },
  });
  fs.unlinkSync(BASELINE);
  console.log('Home-config restaurée, fichier baseline supprimé.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
