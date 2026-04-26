#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const NEW_SPECS_DIR = path.join(ROOT, 'cypress', 'e2e', 'new');
const CYPRESS_CONFIG = path.join(ROOT, 'cypress.config.cjs');

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function collectSpecsRec(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSpecsRec(abs));
      return;
    }
    if (entry.isFile() && entry.name.endsWith('.cy.js')) {
      out.push(path.relative(ROOT, abs).replace(/\\/g, '/'));
    }
  });
  return out;
}

function runSpec(specRelPath) {
  const env = { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: '1' };
  delete env.ELECTRON_RUN_AS_NODE;

  const args = ['cypress', 'run', '--config-file', CYPRESS_CONFIG, '--spec', specRelPath];
  const res = spawnSync('npx', args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (res.error) {
    console.error(`[failfast] launch error on ${specRelPath}: ${res.error.message}`);
    return 2;
  }
  return typeof res.status === 'number' ? res.status : 2;
}

function main() {
  if (!fs.existsSync(NEW_SPECS_DIR)) {
    console.error(`[failfast] missing folder: ${NEW_SPECS_DIR}`);
    process.exit(2);
  }

  const runs = intEnv('E2E_FAILFAST_RUNS', 1);
  const maxSpecs = intEnv('E2E_FAILFAST_MAX_SPECS', 0);
  const filterRaw = String(process.env.E2E_FAILFAST_FILTER || '').trim();
  const filter = filterRaw ? new RegExp(filterRaw, 'i') : null;

  let specs = collectSpecsRec(NEW_SPECS_DIR).sort((a, b) => a.localeCompare(b));
  if (filter) {
    specs = specs.filter((s) => filter.test(s));
  }
  if (maxSpecs > 0) {
    specs = specs.slice(0, maxSpecs);
  }

  if (specs.length === 0) {
    console.error('[failfast] no matching specs in cypress/e2e/new');
    process.exit(2);
  }

  console.log(`[failfast] runs=${runs} specs=${specs.length}`);
  if (filterRaw) console.log(`[failfast] filter=${filterRaw}`);
  if (maxSpecs > 0) console.log(`[failfast] maxSpecs=${maxSpecs}`);

  for (let runIndex = 1; runIndex <= runs; runIndex += 1) {
    console.log(`\n[failfast] ===== run ${runIndex}/${runs} =====`);

    for (const spec of specs) {
      console.log(`\n[failfast] RUN ${spec}`);
      const code = runSpec(spec);
      if (code !== 0) {
        console.error(`\n[failfast] STOP on first failure: ${spec} (exit=${code})`);
        process.exit(code);
      }
    }

    console.log(`[failfast] run ${runIndex}/${runs} OK`);
  }

  console.log('\n[failfast] ALL_GREEN');
}

main();
