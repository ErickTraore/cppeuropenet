// Vérification préalable : s'assurer que le serveur Express dev est bien lancé dans le bon dossier
before(function () {
  cy.task('checkServerDev').then((exists) => {
    if (!exists) {
      throw new Error('Le serveur Express dev (server.dev.js) doit être lancé dans hostinger-cppeurope/frontend avant d’exécuter ce test.');
    }
  });
  // Frontend inventaire : /api/ping est fourni par server.prod.js, pas par `serve` statique
  cy.task('ensureFrontendProd8082');
});

const { servicePingUrl } = require('../../../support/e2eApiUrls');

function serviceRequestOptions(service) {
  const method = (service.healthMethod || 'GET').toUpperCase();
  const path = service.healthPath || '/api/ping';
  const port = service.healthPort || service.port;
  const body = service.healthBody;
  return {
    method,
    url: servicePingUrl(port, path),
    body,
  };
}

describe('00C - Démarrage et accessibilité de tous les serveurs Docker', () => {
  it('Tous les serveurs doivent répondre sur /api/ping', () => {
    cy.readFile('services-inventory.json').then((services) => {
      expect(services, 'services-inventory.json').to.be.an('array');
      services.forEach((service) => {
        const name = String(service.name || '').toLowerCase();
        if (name.includes('frontend')) {
          cy.task('checkFrontPing').should('eq', 'ok');
          return;
        }
        if (name.includes('home-config')) {
          cy.task('checkHomeConfigViaFront').should('eq', 'ok');
          return;
        }
        const req = serviceRequestOptions(service);
        cy.request({
          ...req,
          failOnStatusCode: false,
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
});
