#!/usr/bin/env node
/**
 * Monte tous les conteneurs Docker nécessaires aux E2E, à partir de services-inventory.json.
 * - Chaque dossier contabo-cppeurope/* avec docker-compose : `docker compose up -d` (ou localComposeDev si défini).
 * - Ikoula : `docker compose --env-file docker-compose.e2e.env` (ports figés Cypress) ou
 *   repli sur docker-compose.production.env si absent.
 *
 * Prérequis : Docker Desktop démarré. Cwd d'exécution : n'importe où (chemins absolus).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { runInfrastructureGate } = require('./e2eInfrastructure.cjs');

const FRONTEND_DIR = path.resolve(__dirname, '..');
const IKOULA_ROOT = path.resolve(FRONTEND_DIR, '..');
const WORKSPACE_ROOT = path.resolve(IKOULA_ROOT, '..');
const INVENTORY = path.join(FRONTEND_DIR, 'services-inventory.json');

function dockerSafeEnv() {
  const env = { ...process.env };
  // Avoid stale API pinning (ex: DOCKER_API_VERSION=1.44) that breaks newer Docker Desktop.
  delete env.DOCKER_API_VERSION;
  // Keep compose logs deterministic and non-interactive (no spinner/ANSI noise).
  env.COMPOSE_ANSI = 'never';
  env.BUILDKIT_PROGRESS = 'plain';
  return env;
}

function dockerInfoReady() {
  const r = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    shell: false,
    env: dockerSafeEnv(),
  });
  return r.status === 0;
}

function waitForDockerDaemon(maxIterations = 60, sleepMs = 2000) {
  if (dockerInfoReady()) {
    console.log('[e2e-docker-up] Docker daemon deja pret.');
    return;
  }

  console.log(`[e2e-docker-up] Attente Docker daemon (${maxIterations} iterations max)...`);
  for (let i = 1; i <= maxIterations; i += 1) {
    if (dockerInfoReady()) {
      console.log(`[e2e-docker-up] Docker daemon pret a l'iteration ${i}/${maxIterations}.`);
      return;
    }
    console.log(`[e2e-docker-up] Docker iteration ${i}/${maxIterations}: demarrage en cours...`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, sleepMs);
  }

  throw new Error(
    'Docker daemon indisponible apres attente. Ouvrir Docker Desktop, verifier son etat, puis relancer.',
  );
}

function runShell(cwd, command, args) {
  const isDockerCommand = command === 'docker';
  const timeoutMs = Number(process.env.E2E_DOCKER_CMD_TIMEOUT_MS || 600000);
  const r = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: false,
    env: dockerSafeEnv(),
    timeout: isDockerCommand ? timeoutMs : undefined,
  });
  if (r.error && r.error.code === 'ETIMEDOUT') {
    throw new Error(
      `Commande docker expiree apres ${timeoutMs}ms dans ${cwd}: ${command} ${args.join(' ')}`,
    );
  }
  if (r.status !== 0) {
    throw new Error(`Commande échouée (exit ${r.status}) dans ${cwd}: ${command} ${args.join(' ')}`);
  }
}

function findComposeEnvFile(cwd) {
  const candidates = [
    'docker-compose.production.env',
    'docker-compose.production.env.example',
    'docker-compose.staging.env',
    'docker-compose.staging.env.example',
    'docker-compose.dev.env',
    'docker-compose.dev.env.example',
  ];

  return candidates.map((name) => path.join(cwd, name)).find((filePath) => fs.existsSync(filePath)) || null;
}

function parseEnvFile(envFile) {
  const envMap = {};
  if (!envFile || !fs.existsSync(envFile)) return envMap;

  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    envMap[key] = value;
  }

  return envMap;
}

function resolveTemplate(rawValue, envMap) {
  return rawValue.replace(/\$\{([^}:]+)(?::-([^}]+))?\}/g, (_match, name, fallback) => {
    if (Object.prototype.hasOwnProperty.call(envMap, name)) return envMap[name];
    if (Object.prototype.hasOwnProperty.call(process.env, name)) return process.env[name];
    return fallback || '';
  });
}

function ensureDockerResource(kind, name, cwd) {
  if (!name) return;
  const inspectArgs = [kind, 'inspect', name];
  const inspect = spawnSync('docker', inspectArgs, { cwd, stdio: 'ignore', env: dockerSafeEnv(), shell: false });
  if (inspect.status === 0) return;

  console.log(`   [e2e-docker-up] create ${kind} ${name}`);
  runShell(cwd, 'docker', [kind, 'create', name]);
}

function ensureComposeExternalResources(cwd, composeFile, envFile) {
  const envMap = parseEnvFile(envFile);
  const lines = fs.readFileSync(composeFile, 'utf8').split(/\r?\n/);
  const resources = [];
  let section = null;
  let current = null;

  function flushCurrent() {
    if (!current || !current.external || !current.nameTemplate) return;
    const resolvedName = resolveTemplate(current.nameTemplate, envMap).trim();
    if (!resolvedName) return;
    resources.push({ kind: current.kind, name: resolvedName });
  }

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const indent = rawLine.match(/^\s*/)[0].length;

    if (indent === 0) {
      flushCurrent();
      current = null;
      if (trimmed === 'volumes:') {
        section = 'volume';
      } else if (trimmed === 'networks:') {
        section = 'network';
      } else {
        section = null;
      }
      continue;
    }

    if (!section) continue;

    if (indent === 2 && trimmed.endsWith(':')) {
      flushCurrent();
      current = { kind: section, external: false, nameTemplate: '' };
      continue;
    }

    if (!current) continue;

    if (indent >= 4 && trimmed === 'external: true') {
      current.external = true;
      continue;
    }

    if (indent >= 4 && trimmed.startsWith('name:')) {
      current.nameTemplate = trimmed.slice('name:'.length).trim();
    }
  }

  flushCurrent();

  for (const resource of resources) {
    ensureDockerResource(resource.kind, resource.name, cwd);
  }
}

function dockerComposeUp(cwd, extraArgs = []) {
  const args = ['compose'];
  const envFile = findComposeEnvFile(cwd);
  const composeFileName = extraArgs[0] === '-f' && extraArgs[1] ? extraArgs[1] : 'docker-compose.yml';
  const composeFilePath = path.join(cwd, composeFileName);

  if (envFile) {
    args.push('--env-file', envFile);
    console.log(`   [e2e-docker-up] --env-file ${path.basename(envFile)}`);
  }

  if (fs.existsSync(composeFilePath)) {
    ensureComposeExternalResources(cwd, composeFilePath, envFile);
  }

  args.push('up', '-d', ...extraArgs);
  runShell(cwd, 'docker', args);
}

function ensureIkoulaLocalTlsMaterial(envFile) {
  if (!envFile || path.basename(envFile) !== 'docker-compose.e2e.env') return;

  const envMap = parseEnvFile(envFile);
  const letsencryptRaw = envMap.LETSENCRYPT_PATH;
  if (!letsencryptRaw) return;

  const letsencryptRoot = path.isAbsolute(letsencryptRaw)
    ? letsencryptRaw
    : path.resolve(IKOULA_ROOT, letsencryptRaw);
  const certDir = path.join(letsencryptRoot, 'live', 'cppeurope.net');
  const fullchain = path.join(certDir, 'fullchain.pem');
  const privkey = path.join(certDir, 'privkey.pem');

  if (fs.existsSync(fullchain) && fs.existsSync(privkey)) {
    console.log(`[e2e-docker-up] Certificats locaux detectes: ${certDir}`);
    return;
  }

  const certScript = path.join(IKOULA_ROOT, 'scripts', 'generate-local-certs.sh');
  if (!fs.existsSync(certScript)) {
    throw new Error(
      `Certificats locaux manquants (${certDir}) et script absent: ${certScript}.`,
    );
  }

  console.log('[e2e-docker-up] Certificats locaux manquants: generation automatique...');
  runShell(IKOULA_ROOT, 'bash', [certScript]);

  if (!fs.existsSync(fullchain) || !fs.existsSync(privkey)) {
    throw new Error(`Generation TLS incomplète: ${fullchain} / ${privkey}`);
  }
}

/** Ikoula : ports stables via docker-compose.e2e.env (versionné) ou docker-compose.production.env. */
function dockerComposeUpIkoula() {
  const e2eEnv = path.join(IKOULA_ROOT, 'docker-compose.e2e.env');
  const prodEnv = path.join(IKOULA_ROOT, 'docker-compose.production.env');
  const envFile = [e2eEnv, prodEnv].find((f) => fs.existsSync(f));
  const args = ['compose'];
  if (envFile) {
    ensureIkoulaLocalTlsMaterial(envFile);
    args.push('--env-file', envFile);
    console.log(`   [e2e-docker-up] --env-file ${path.basename(envFile)} (ports stables)`);
  } else {
    console.warn(
      '   [e2e-docker-up] Aucun docker-compose.e2e.env ni docker-compose.production.env : risque de ports non interpolés.',
    );
  }
  args.push('-f', 'docker-compose.yml', 'up', '-d');
  runShell(IKOULA_ROOT, 'docker', args);
}

function parseFailureLabelsFromGateError(message) {
  const labels = [];
  const regex = /^\s*•\s+(.+)$/gm;
  let m;
  while ((m = regex.exec(String(message || '')))) {
    labels.push(String(m[1] || '').trim());
  }
  return labels;
}

function inferContaboRecoveryTargets(failureLabels, contaboStacks) {
  const byName = new Map(contaboStacks.map((s) => [String(s.name || '').toLowerCase(), s]));
  const targets = new Map();

  for (const rawLabel of failureLabels) {
    const label = String(rawLabel || '').toLowerCase();
    for (const [stackName, stack] of byName.entries()) {
      if (label.startsWith(stackName)) {
        targets.set(stack.abs, stack);
      }
    }
    if (label.includes('usermediaprofile') || label.includes('user media profile')) {
      const s = byName.get('usermediaprofile-backend');
      if (s) targets.set(s.abs, s);
    }
    if (label.includes('presselocale')) {
      const s = byName.get('presselocale-backend');
      if (s) targets.set(s.abs, s);
    }
  }

  // Recovery safety net for the two historically flaky DB-network stacks.
  for (const fallbackName of ['usermediaprofile-backend', 'presselocale-backend']) {
    const s = byName.get(fallbackName);
    if (s) targets.set(s.abs, s);
  }

  return [...targets.values()];
}

async function verifyAndAutoHealInfrastructure(contaboStacks) {
  const firstCheckMaxMs = parseInt(process.env.E2E_DOCKER_VERIFY_MAX_MS || '45000', 10);
  const healCheckMaxMs = parseInt(process.env.E2E_DOCKER_HEAL_VERIFY_MAX_MS || '120000', 10);

  try {
    await runInfrastructureGate({
      maxWaitMs: firstCheckMaxMs,
      pollMs: 2000,
      progressPrefix: 'e2e-docker-up verify',
    });
    console.log('[e2e-docker-up] Vérification infra OK (post docker-up).');
    return;
  } catch (err) {
    const labels = parseFailureLabelsFromGateError(err?.message);
    const recoveryTargets = inferContaboRecoveryTargets(labels, contaboStacks);
    if (recoveryTargets.length === 0) {
      throw err;
    }

    console.warn('[e2e-docker-up] Infra incomplète après démarrage initial, tentative auto-heal ciblée...');
    if (labels.length > 0) {
      console.warn(`[e2e-docker-up] Checks en échec: ${labels.join(' | ')}`);
    }

    for (const stack of recoveryTargets) {
      console.log(`\n[e2e-docker-up] Auto-heal stack: ${stack.name}\n   ${stack.abs}`);
      dockerComposeUp(stack.abs, ['--force-recreate']);
    }

    await runInfrastructureGate({
      maxWaitMs: healCheckMaxMs,
      pollMs: 2000,
      progressPrefix: 'e2e-docker-up heal',
    });
    console.log('[e2e-docker-up] Auto-heal terminé: infrastructure validée.');
  }
}

async function main() {
  waitForDockerDaemon();

  if (!fs.existsSync(INVENTORY)) {
    throw new Error(`Inventaire introuvable: ${INVENTORY}`);
  }
  const services = JSON.parse(fs.readFileSync(INVENTORY, 'utf8'));
  if (!Array.isArray(services)) {
    throw new Error('services-inventory.json doit être un tableau');
  }

  const contaboDirs = [];
  let needIkoulaStack = false;

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
    } else if (rel.startsWith('front-cppeurope/')) {
      needIkoulaStack = true;
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

  const ikoulaCompose = path.join(IKOULA_ROOT, 'docker-compose.yml');
  const ikoulaStep =
    needIkoulaStack && fs.existsSync(ikoulaCompose) ? 1 : needIkoulaStack ? 0 : 0;
  const totalComposeSteps = uniqueContabo.length + (ikoulaStep ? 1 : 0);

  console.log('\n[e2e-docker-up] ─────────────────────────────────────────');
  console.log('[e2e-docker-up] Démarrage Docker (souvent 1–3 min) : chaque compose affiche sa sortie ci-dessous.');
  console.log(`[e2e-docker-up] Workspace: ${WORKSPACE_ROOT}`);
  console.log(
    `[e2e-docker-up] ${totalComposeSteps} étape(s) compose (Contabo: ${uniqueContabo.length}${ikoulaStep ? ' + Ikoula' : ''}).`,
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

  if (needIkoulaStack && fs.existsSync(ikoulaCompose)) {
    stepIndex += 1;
    console.log(
      `\n[e2e-docker-up] Étape ${stepIndex}/${totalComposeSteps} — Ikoula (user-backend + front + DB)\n   ${IKOULA_ROOT}`,
    );
    dockerComposeUpIkoula();
  } else if (needIkoulaStack) {
    console.warn(`[e2e-docker-up] docker-compose.yml Ikoula introuvable: ${ikoulaCompose}`);
  }

  await verifyAndAutoHealInfrastructure(uniqueContabo);

  console.log('\n[e2e-docker-up] Terminé. Vérifie les ports avec: npm run e2e:precheck');
}

main().catch((err) => {
  console.error(`\n[e2e-docker-up] Echec: ${err.message}`);
  process.exit(1);
});
