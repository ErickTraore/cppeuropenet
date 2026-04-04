// Vérification préalable : s'assurer que le serveur Express dev est bien lancé dans le bon dossier
before(function () {
  cy.task('checkServerDev').then((exists) => {
    if (!exists) {
      throw new Error('Le serveur Express dev (server.dev.js) doit être lancé dans hostinger-cppeurope/frontend avant d’exécuter ce test.');
    }
  });
});
// cypress/e2e/00c_servicesStartAll.cy.js
// Ce test vérifie que tous les serveurs Docker nécessaires sont démarrés, accessibles sur /api/ping,
// et donne des messages explicites en cas de problème de droits SQL ou de base manquante.

describe('00C - Démarrage et accessibilité de tous les serveurs Docker', () => {
  before(function () {
    cy.readFile('services-inventory.json').then((services) => {
      this.services = services;
    });
  });

  it('Tous les serveurs doivent répondre sur /api/ping', function () {
    this.services.forEach(service => {
      const url = `http://localhost:${service.port}/api/ping`;
      cy.request({
        url,
        failOnStatusCode: false
      }).then((resp) => {
        expect([200, 304, 401, 400]).to.include(resp.status, `${service.name} KO: code ${resp.status}`);
        if (resp.body && typeof resp.body === 'object') {
          if (resp.body.message && resp.body.message.match(/access denied|denied for user/i)) {
            throw new Error(`${service.name}: Problème de droits SQL (Access denied)`);
          }
          if (resp.body.message && resp.body.message.match(/unknown database|does not exist/i)) {
            throw new Error(`${service.name}: Base de données manquante`);
          }
        }
      });
    });
  });
});
