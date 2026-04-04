// Vérification préalable : s'assurer que le serveur Express dev est bien lancé dans le bon dossier
before(function () {
  cy.task('checkServerDev').then((exists) => {
    if (!exists) {
      throw new Error('Le serveur Express dev (server.dev.js) doit être lancé dans hostinger-cppeurope/frontend avant d’exécuter ce test.');
    }
  });
  // Frontend inventaire (8082) : /api/ping est fourni par server.prod.js, pas par `serve` statique
  cy.task('ensureFrontendProd8082');
});

describe('00C - Démarrage et accessibilité de tous les serveurs Docker', () => {
  it('Tous les serveurs doivent répondre sur /api/ping', () => {
    cy.readFile('services-inventory.json').then((services) => {
      expect(services, 'services-inventory.json').to.be.an('array');
      const base = Cypress.config('baseUrl');
      services.forEach((service) => {
        const url =
          service.name === 'userMediaProfile-backend'
            ? `${base}/api/__health/user-media-profile`
            : `http://localhost:${service.port}/api/ping`;
        cy.request({
          url,
          failOnStatusCode: false,
        }).then((resp) => {
          if (service.name === 'userMediaProfile-backend') {
            expect(resp.status, `${service.name} KO`).to.eq(200);
            expect(resp.body && resp.body.ok, `${service.name} ping média`).to.be.true;
            return;
          }
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
});
