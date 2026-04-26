#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const SPECS_DIR = path.join(ROOT, 'cypress', 'e2e', 'new');
const BASELINE_FILE = path.join(__dirname, 'e2e-spec-baseline.json');

function collectSpecs(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSpecs(abs));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.cy.js')) {
      out.push(abs);
    }
  }
  return out;
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

if (!fs.existsSync(SPECS_DIR)) {
  console.error(`[E2E_BASELINE] Missing specs folder: ${SPECS_DIR}`);
  process.exit(1);
}

const specs = collectSpecs(SPECS_DIR).sort((a, b) => a.localeCompare(b));
const files = {};

for (const abs of specs) {
  const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
  const content = fs.readFileSync(abs, 'utf8');
  files[rel] = {
    sha256: sha256(content),
    lines: content.split(/\r?\n/).length,
    bytes: Buffer.byteLength(content, 'utf8'),
  };
}

const baseline = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: 'cypress/e2e/new/**/*.cy.js',
  files,
};

fs.writeFileSync(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
console.log(`[E2E_BASELINE] Wrote ${Object.keys(files).length} entries to scripts/e2e-spec-baseline.json`);
