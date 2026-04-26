#!/usr/bin/env node

const { spawnSync } = require('child_process');

const DEFAULT_SPECS = [
  'cypress/e2e/new/new-0-start/002_servicesStatusExtended.cy.js',
  'cypress/e2e/new/new-0-start/003_servicesStartAll.cy.js',
  'cypress/e2e/new/new-0-start/004_servicesInventory.cy.js',
  'cypress/e2e/new/new-9/030_profilePageImagesAvatars.cy.js',
  'cypress/e2e/new/new-9/031_sessionInvalidationReload.cy.js',
  'cypress/e2e/new/new-9/032_usersAdmin2026User2026.cy.js',
  'cypress/e2e/new/new-10/033_presseGeneralePhotoKeepsShell.cy.js',
  'cypress/e2e/new/new-10/034_presseGeneraleConsultAfterCreateOption1.cy.js',
  'cypress/e2e/new/new-10/035_presseGeneraleConsultAfterCreateOption2.cy.js',
  'cypress/e2e/new/new-10/036_presseGeneraleConsultAfterCreateOption3.cy.js',
  'cypress/e2e/new/new-10/037_presseGeneraleConsultAfterCreateOption4.cy.js',
  'cypress/e2e/new/new-10/038_presseLocaleConsultAfterCreateOption1.cy.js',
  'cypress/e2e/new/new-10/039_presseLocaleConsultAfterCreateOption2.cy.js',
  'cypress/e2e/new/new-10/040_presseLocaleConsultAfterCreateOption3.cy.js',
  'cypress/e2e/new/new-10/041_presseLocaleConsultAfterCreateOption4.cy.js',
  'cypress/e2e/new/new-11/042_homePageRendersAdminConfig.cy.js',
].join(',');

function parseIntEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env },
  });
}

function runGate() {
  const runs = parseIntEnv('E2E_GATE_RUNS', 5);
  const allowFailures = parseIntEnv('E2E_GATE_MAX_FAILURES', 0);
  const specs = process.env.E2E_GATE_SPECS || DEFAULT_SPECS;

  const summary = [];
  let failures = 0;

  console.log(`[gate] start=${nowIso()} runs=${runs} allowFailures=${allowFailures}`);
  console.log(`[gate] specs=${specs}`);

  // Precheck once up front, then reuse running stack for all iterations.
  const pre = runCommand('node', ['scripts/precheck-e2e.js']);
  if (pre.status !== 0) {
    console.error(`[gate] precheck failed with exit=${pre.status}`);
    process.exit(pre.status || 2);
  }

  for (let i = 1; i <= runs; i += 1) {
    const start = Date.now();
    console.log(`\n[gate] run ${i}/${runs} started=${nowIso()}`);

    const res = runCommand('npx', [
      'cypress',
      'run',
      '--config-file',
      'cypress.config.cjs',
      '--spec',
      specs,
    ]);

    const durationMs = Date.now() - start;
    const ok = res.status === 0;
    if (!ok) failures += 1;

    summary.push({ index: i, ok, exit: res.status, durationMs });

    const durationSec = (durationMs / 1000).toFixed(1);
    console.log(`[gate] run ${i}/${runs} ok=${ok} exit=${res.status} duration=${durationSec}s`);

    if (failures > allowFailures) {
      console.error(`[gate] stop early: failures=${failures} > allowFailures=${allowFailures}`);
      break;
    }
  }

  const executed = summary.length;
  const passed = summary.filter((r) => r.ok).length;
  const failed = executed - passed;
  const flakeRate = executed > 0 ? ((failed / executed) * 100).toFixed(2) : '0.00';

  console.log('\n[gate] summary');
  console.log(`[gate] executed=${executed} passed=${passed} failed=${failed} flakeRate=${flakeRate}%`);
  summary.forEach((r) => {
    const sec = (r.durationMs / 1000).toFixed(1);
    console.log(`[gate] #${r.index} ok=${r.ok} exit=${r.exit} duration=${sec}s`);
  });

  if (failed > allowFailures) {
    console.error(`[gate] FAILED (failed=${failed}, allowFailures=${allowFailures})`);
    process.exit(1);
  }

  console.log('[gate] PASSED');
  process.exit(0);
}

runGate();
