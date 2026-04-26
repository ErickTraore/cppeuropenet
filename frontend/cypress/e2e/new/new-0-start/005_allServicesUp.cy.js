// cypress/e2e/00e_allServicesUp.cy.js
// Ce test vérifie que tous les serveurs listés dans l'inventaire sont accessibles sur leur endpoint de healthcheck

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

describe('00E - Tous les serveurs sont accessibles (EP)', () => {
  before(() => {
    cy.task('ensureFrontendProd8082');
  });

  it('Chaque service de l\'inventaire doit répondre sur /api/ping', () => {
    cy.readFile('services-inventory.json').then((inventory) => {
      inventory.forEach((service) => {
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
          expect(resp.status).to.be.oneOf([200, 304, 400, 401]);
        });
      });
    });
  });
});
