#!/usr/bin/env node
/**
 * Garde-fou E2E:
 * Empêche l'introduction d'URLs locales hardcodées sur des ports non déclarés
 * dans services-inventory.json pour les fichiers de plomberie E2E critiques.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INVENTORY_PATH = path.join(ROOT, 'services-inventory.json');

const TARGET_FILES = [
  'scripts/precheck-e2e.js',
  'scripts/wait-e2e-services.js',
  'scripts/e2eInfrastructure.cjs',
  'scripts/e2e-docker-up-all.cjs',
  'scripts/restore-e2e-home-baseline.js',
  'cypress/support/e2eServiceEndpoints.cjs',
  'cypress.config.cjs',
];

// On contrôle uniquement les URLs locales explicites.
const LOCAL_URL_RE = /(https?:\/\/)(localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3}):(\d{2,5})/g;

function readInventory() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    throw new Error(`Inventaire introuvable: ${INVENTORY_PATH}`);
  }
  const parsed = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('services-inventory.json doit être un tableau');
  }
  return parsed;
}

function allowedPortsFromInventory(services) {
  const ports = new Set();
  services.forEach((s) => {
    const p = Number(s?.port);
    const hp = Number(s?.healthPort);
    if (Number.isFinite(p) && p > 0) ports.add(p);
    if (Number.isFinite(hp) && hp > 0) ports.add(hp);
  });
  return ports;
}

function scanFile(absPath, allowedPorts) {
  const rel = path.relative(ROOT, absPath);
  const content = fs.readFileSync(absPath, 'utf8');
  const violations = [];

  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    let m;
    while ((m = LOCAL_URL_RE.exec(line)) !== null) {
      const port = Number(m[3]);
      if (!allowedPorts.has(port)) {
        violations.push({
          file: rel,
          line: idx + 1,
          endpoint: `${m[2]}:${port}`,
        });
      }
    }
    LOCAL_URL_RE.lastIndex = 0;
  });

  return violations;
}

function main() {
  const services = readInventory();
  const allowedPorts = allowedPortsFromInventory(services);
  const allViolations = [];

  TARGET_FILES.forEach((relPath) => {
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) return;
    allViolations.push(...scanFile(absPath, allowedPorts));
  });

  if (allViolations.length > 0) {
    console.error('Inventory boundary violation(s):');
    allViolations.forEach((v) => {
      console.error(`- ${v.file}:${v.line} -> ${v.endpoint} (port non déclaré dans services-inventory.json)`);
    });
    console.error('\nAction attendue: déclarer le port dans services-inventory.json (port ou healthPort) ou supprimer le hardcode.');
    process.exit(2);
  }

  console.log('Inventory boundary OK: aucun port local hardcodé hors services-inventory.json dans les fichiers E2E critiques.');
}

main();
