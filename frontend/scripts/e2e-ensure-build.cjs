#!/usr/bin/env node
/**
 * Évite le bundle React désaligné des backends E2E :
 * - régénère .env.production.local depuis e2eServiceEndpoints (sauf E2E_SKIP_SYNC_ENV=1)
 * - relance `npm run build` si l’empreinte du .env change, si build/ manque, ou si les sources changent
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');

function latestMtimeMs(startPath) {
  if (!fs.existsSync(startPath)) return 0;
  const stat = fs.statSync(startPath);
  if (stat.isFile()) return stat.mtimeMs;

  let latest = stat.mtimeMs;
  const entries = fs.readdirSync(startPath, { withFileTypes: true });
  for (const entry of entries) {
    const absPath = path.join(startPath, entry.name);
    latest = Math.max(latest, latestMtimeMs(absPath));
  }
  return latest;
}

function main() {
  console.log(
    '[e2e-ensure-build] Alignement .env E2E + build si besoin (le build CRA peut prendre 1–2 min ; la console reste active).',
  );
  if (!process.env.E2E_SKIP_SYNC_ENV) {
    console.log('[e2e-ensure-build] → génération .env.production.local (sync-e2e-react-env)');
    const sync = spawnSync(process.execPath, [path.join(__dirname, 'sync-e2e-react-env.cjs')], {
      cwd: root,
      stdio: 'inherit',
    });
    if (sync.status !== 0) process.exit(sync.status || 1);
  } else {
    const envPath = path.join(root, '.env.production.local');
    if (!fs.existsSync(envPath)) {
      console.error(
        '[e2e-ensure-build] E2E_SKIP_SYNC_ENV=1 mais .env.production.local est absent. Créez-le ou retirez E2E_SKIP_SYNC_ENV.',
      );
      process.exit(1);
    }
  }

  const envPath = path.join(root, '.env.production.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hash = crypto.createHash('sha256').update(envContent).digest('hex');

  const buildIndex = path.join(root, 'build', 'index.html');
  const fingerprintPath = path.join(root, 'build', '.e2e-env-fingerprint');
  const buildIndexMtime = fs.existsSync(buildIndex) ? fs.statSync(buildIndex).mtimeMs : 0;
  const latestSourceMtime = Math.max(
    latestMtimeMs(path.join(root, 'src')),
    latestMtimeMs(path.join(root, 'public')),
    latestMtimeMs(path.join(root, 'package.json')),
    latestMtimeMs(path.join(root, 'server.prod.js')),
  );

  let needsBuild = !fs.existsSync(buildIndex);
  if (!needsBuild && fs.existsSync(fingerprintPath)) {
    const prev = fs.readFileSync(fingerprintPath, 'utf8').trim();
    if (prev !== hash) needsBuild = true;
  } else if (!fs.existsSync(fingerprintPath)) {
    needsBuild = true;
  }
  if (!needsBuild && latestSourceMtime > buildIndexMtime) {
    needsBuild = true;
  }

  if (needsBuild) {
    console.log(
      '[e2e-ensure-build] → npm run build (premier build, .env modifié ou sources modifiées ; sortie webpack/CRA ci-dessous).',
    );
    const b = spawnSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', shell: true });
    if (b.status !== 0) process.exit(b.status || 1);
    fs.mkdirSync(path.join(root, 'build'), { recursive: true });
    fs.writeFileSync(fingerprintPath, hash, 'utf8');
  } else {
    console.log('[e2e-ensure-build] build/ à jour (empreinte .env et sources inchangées).');
  }
}

main();
