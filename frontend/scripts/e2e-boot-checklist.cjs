#!/usr/bin/env node
/**
 * Rappel après redémarrage machine : ordre pour que les E2E « new » soient reproductibles.
 * Monter les conteneurs (Docker Desktop déjà prêt) : npm run e2e:docker-up
 * Tout-en-un après boot : npm run e2e:from-boot (= docker-up + e2e:cold)
 * Commande si stacks déjà up : npm run e2e:cold
 *   = e2e:ensure-build + e2e:precheck + suite Cypress new (sans doubler ensure-build).
 * Convention : les fichiers cypress/e2e/new/00x_*.cy.js sont ordonnés volontairement ; ne pas
 * paralléliser cette suite ni renommer sans vérifier les dépendances entre specs.
 */
const path = require('path');
const inventory = path.join(__dirname, '..', 'services-inventory.json');

// eslint-disable-next-line no-console
console.log(`
=== E2E — après reboot (checklist) ===

1. Démarrer Docker Desktop et attendre qu’il soit prêt.
2. Monter les stacks (automatisé) :
     npm run e2e:docker-up
   (lit services-inventory.json : chaque dossier contabo + docker-compose Hostinger racine.)
   Ports attendus : voir
   ${inventory}
3. Commandes e2e (même chose depuis la racine hostinger-cppeurope/ ou depuis frontend/) :
   • Depuis zéro (Docker vide) : npm run e2e:from-boot
   • Stacks déjà up : npm run e2e:cold

   Rappel texte (cette liste) : npm run e2e:boot-checklist — dispo à la racine hostinger-cppeurope et dans frontend.

   Ou étape par étape :
     npm run e2e:ensure-build
     npm run e2e:precheck
     npm run cypress:run:new

Variables utiles si Docker est lent au démarrage :
  E2E_PRECHECK_MAX_MS=120000 npm run e2e:precheck
  E2E_PRECHECK_PROGRESS_MS=5000 npm run e2e:precheck   (messages « En cours » plus fréquents)
  CYPRESS_E2E_GATE_MAX_MS=240000 npm run e2e:cold

Les specs utilisent 127.0.0.1 (pas localhost) pour les API directes — aligné sur cypress.config baseUrl.
`);
