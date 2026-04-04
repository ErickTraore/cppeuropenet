// cypress/e2e/00e_allServicesUp.cy.js
// Ce test vérifie que tous les serveurs listés dans l'inventaire sont accessibles sur leur endpoint de healthcheck

describe('00E - Tous les serveurs sont accessibles (EP)', () => {
  before(() => {
    cy.task('ensureFrontendProd8082');
  });

  it('Chaque service de l\'inventaire doit répondre sur /api/ping', () => {
    cy.readFile('services-inventory.json').then((inventory) => {
      const base = Cypress.config('baseUrl');
      inventory.forEach((service) => {
        const url =
          service.name === 'userMediaProfile-backend'
            ? `${base}/api/__health/user-media-profile`
            : `http://localhost:${service.port}/api/ping`;
        cy.request({
          url,
          failOnStatusCode: false,
        }).then((resp) => {
          if (service.name === 'userMediaProfile-backend') {
            expect(resp.status).to.eq(200);
            expect(resp.body && resp.body.ok).to.be.true;
          } else {
            expect(resp.status).to.be.oneOf([200, 304]);
          }
        });
      });
    });
  });
});
