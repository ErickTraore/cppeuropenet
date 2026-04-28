#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_FILE = path.join(__dirname, 'e2e-spec-baseline.json');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

if (!fs.existsSync(BASELINE_FILE)) {
  console.error('[E2E_BASELINE] Missing baseline file scripts/e2e-spec-baseline.json');
  console.error('[E2E_BASELINE] Run: npm run e2e:baseline:freeze');
  process.exit(1);
}

const baseline = readJson(BASELINE_FILE);
const baselineFiles = baseline && baseline.files ? baseline.files : {};
const expected = Object.keys(baselineFiles).sort((a, b) => a.localeCompare(b));

const violations = [];

for (const rel of expected) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    violations.push(`MISSING: ${rel}`);
    continue;
  }

  const content = fs.readFileSync(abs, 'utf8');
  const nowHash = sha256(content);
  const nowLines = content.split(/\r?\n/).length;
  const nowBytes = Buffer.byteLength(content, 'utf8');
  const exp = baselineFiles[rel];

  if (nowHash !== exp.sha256) {
    violations.push(
      `CHANGED: ${rel} (hash ${exp.sha256.slice(0, 12)} -> ${nowHash.slice(0, 12)}, lines ${exp.lines} -> ${nowLines}, bytes ${exp.bytes} -> ${nowBytes})`
    );
  }
}

const baselineSet = new Set(expected);
function collectCurrent(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectCurrent(abs));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.cy.js')) {
      out.push(path.relative(ROOT, abs).replace(/\\/g, '/'));
    }
  }
  return out;
}

const currentDir = path.join(ROOT, 'cypress', 'e2e', 'new');
if (fs.existsSync(currentDir)) {
  const current = collectCurrent(currentDir);
  for (const rel of current) {
    if (!baselineSet.has(rel)) {
      violations.push(`UNTRACKED: ${rel}`);
    }
  }
}

if (violations.length) {
  console.error('\n[E2E_BASELINE] Verification failed. Spec set drift detected:');
  for (const line of violations) {
    console.error(`- ${line}`);
  }
  console.error('\n[E2E_BASELINE] If changes are intentional, refresh baseline explicitly:');
  console.error('- npm run e2e:baseline:freeze');
  process.exit(1);
}

console.log(`[E2E_BASELINE] OK (${expected.length} files match baseline)`);
