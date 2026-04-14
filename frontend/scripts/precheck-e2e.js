#!/usr/bin/env node
/**
 * Pré-vol avant Cypress (npm run pretest:e2e / precypress:run).
 * Même logique que la tâche Cypress assertE2EInfrastructure (e2eInfrastructure.cjs), délai max plus court.
 */
const { runInfrastructureGate } = require('./e2eInfrastructure.cjs');

async function main() {
  const maxWaitMs = parseInt(process.env.E2E_PRECHECK_MAX_MS || '90000', 10);
  const pollMs = parseInt(process.env.E2E_PRECHECK_POLL_MS || '2000', 10);
  const maxSec = Math.round(maxWaitMs / 1000);
  console.log(
    `Precheck e2e: vérification des prérequis (infra HTTP). Peut prendre jusqu'à ~${maxSec}s si Docker démarre lentement — des lignes « En cours » confirment que rien n'est figé.`,
  );
  await runInfrastructureGate({
    maxWaitMs,
    pollMs,
    progressPrefix: 'Precheck e2e',
  });
  console.log('\nPrecheck e2e OK: toutes les conditions sont reunies.');
  process.exit(0);
}

main().catch((err) => {
  console.error(`\nPrecheck e2e KO: ${err.message}`);
  console.error('\nRappel: demarrer les services Docker (Hostinger + Contabo), liberer les ports sur 127.0.0.1, puis relancer.');
  process.exit(2);
});
