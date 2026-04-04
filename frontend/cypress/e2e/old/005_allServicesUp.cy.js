// cypress/e2e/00e_allServicesUp.cy.js
// Ce test vérifie que tous les serveurs listés dans l'inventaire sont accessibles sur leur endpoint de healthcheck

describe('00E - Tous les serveurs sont accessibles (EP)', () => {
  it('Chaque service de l\'inventaire doit répondre sur /api/ping', () => {
    cy.readFile('services-inventory.json').then((inventory) => {
      inventory.forEach(service => {
        cy.request({
          url: `http://localhost:${service.port}/api/ping`,
          failOnStatusCode: false
        }).its('status').should('be.oneOf', [200, 304]);
      });
    });
  });
});
