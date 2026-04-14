#!/usr/bin/env node
/**
 * Monte tous les conteneurs Docker nécessaires aux E2E, à partir de services-inventory.json.
 * - Chaque dossier contabo-cppeurope/* avec docker-compose : `docker compose up -d` (ou localComposeDev si défini).
 * - Hostinger user-backend / front : un seul `docker compose up -d` à la racine hostinger-cppeurope (compose parent).
 *
 * Prérequis : Docker Desktop démarré. Cwd d'exécution : n'importe où (chemins absolus).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const FRONTEND_DIR = path.resolve(__dirname, '..');
const HOSTINGER_ROOT = path.resolve(FRONTEND_DIR, '..');
const WORKSPACE_ROOT = path.resolve(HOSTINGER_ROOT, '..');
const INVENTORY = path.join(FRONTEND_DIR, 'services-inventory.json');

function runShell(cwd, command, args) {
  const r = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env },
  });
  if (r.status !== 0) {
    throw new Error(`Commande échouée (exit ${r.status}) dans ${cwd}: ${command} ${args.join(' ')}`);
  }
}

function dockerComposeUp(cwd, extraArgs = []) {
  runShell(cwd, 'docker', ['compose', 'up', '-d', ...extraArgs]);
}

function main() {
  if (!fs.existsSync(INVENTORY)) {
    throw new Error(`Inventaire introuvable: ${INVENTORY}`);
  }
  const services = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  if (!Array.isArray(services)) {
    throw new Error('services-inventory.json doit être un tableau');
  }

  const contaboDirs = [];
  let needHostingerStack = false;

  for (const s of services) {
    if (!s.docker) continue;
    const rel = s.path;
    if (!rel || typeof rel !== 'string') continue;

    if (rel.startsWith('contabo-cppeurope/')) {
      const abs = path.join(WORKSPACE_ROOT, rel);
      if (!fs.existsSync(abs)) {
        console.warn(`[e2e-docker-up] Dossier absent (ignoré): ${abs}`);
        continue;
      }
      contaboDirs.push({ name: s.name, abs, localComposeDev: s.localComposeDev });
    } else if (rel.startsWith('hostinger-cppeurope/')) {
      needHostingerStack = true;
    }
  }

  // Dédupliquer les dossiers Contabo (au cas où)
  const seen = new Set();
  const uniqueContabo = [];
  for (const c of contaboDirs) {
    const k = c.abs;
    if (seen.has(k)) continue;
    seen.add(k);
    uniqueContabo.push(c);
  }

  const hostingerCompose = path.join(HOSTINGER_ROOT, 'docker-compose.yml');
  const hostingerStep =
    needHostingerStack && fs.existsSync(hostingerCompose) ? 1 : needHostingerStack ? 0 : 0;
  const totalComposeSteps = uniqueContabo.length + (hostingerStep ? 1 : 0);

  console.log('\n[e2e-docker-up] ─────────────────────────────────────────');
  console.log('[e2e-docker-up] Démarrage Docker (souvent 1–3 min) : chaque compose affiche sa sortie ci-dessous.');
  console.log(`[e2e-docker-up] Workspace: ${WORKSPACE_ROOT}`);
  console.log(
    `[e2e-docker-up] ${totalComposeSteps} étape(s) compose (Contabo: ${uniqueContabo.length}${hostingerStep ? ' + Hostinger' : ''}).`,
  );
  console.log('[e2e-docker-up] ─────────────────────────────────────────\n');

  let stepIndex = 0;
  for (const { name, abs, localComposeDev } of uniqueContabo) {
    stepIndex += 1;
    console.log(`\n[e2e-docker-up] Étape ${stepIndex}/${totalComposeSteps} — ${name}\n   ${abs}`);
    if (localComposeDev && typeof localComposeDev === 'string') {
      const parts = localComposeDev.trim().split(/\s+/);
      const cmd = parts[0];
      const args = parts.slice(1);
      const r = spawnSync(cmd, args, { cwd: abs, stdio: 'inherit', env: { ...process.env } });
      if (r.status !== 0) {
        throw new Error(`Échec localComposeDev pour ${name} (exit ${r.status})`);
      }
    } else if (fs.existsSync(path.join(abs, 'docker-compose.yml'))) {
      dockerComposeUp(abs);
    } else if (fs.existsSync(path.join(abs, 'docker-compose.dev.yml'))) {
      dockerComposeUp(abs, ['-f', 'docker-compose.dev.yml']);
    } else {
      console.warn(`   Aucun docker-compose.yml / .dev.yml — ignoré.`);
    }
  }

  if (needHostingerStack && fs.existsSync(hostingerCompose)) {
    stepIndex += 1;
    console.log(
      `\n[e2e-docker-up] Étape ${stepIndex}/${totalComposeSteps} — Hostinger (user-backend + front + DB)\n   ${HOSTINGER_ROOT}`,
    );
    dockerComposeUp(HOSTINGER_ROOT);
  } else if (needHostingerStack) {
    console.warn(`[e2e-docker-up] docker-compose.yml Hostinger introuvable: ${hostingerCompose}`);
  }

  console.log('\n[e2e-docker-up] Terminé. Vérifie les ports avec: npm run e2e:precheck');
}

main();
