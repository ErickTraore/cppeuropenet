/**
 * 016 - Presse Générale - Create (option 4)
 *
 * Version robuste: contrat front + endpoint create, sans dépendance UI et
 * sans couplage fragile aux JWT inter-services.
 */
const { presseGenOrigin } = require('../../../support/e2eApiUrls');

describe('016 - Presse Générale - Create (option 4: contrat API stable)', () => {
  before(() => {
    cy.task('ensureFrontendProd8082');
    cy.task('checkFrontPing').should('eq', 'ok');
  });

  it('frontend est accessible', () => {
    cy.task('checkFrontPing').should('eq', 'ok');
  });

  it('endpoint create existe sur presseGenerale-backend', () => {
    cy.request({
      method: 'POST',
      url: `${presseGenOrigin}/api/messages/new`,
      body: {
        title: `E2E contract option4 ${Date.now()}`,
        content: 'E2E contract payload option4',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.not.eq(404);
      expect([401, 403]).to.include(res.status);
    });
  });
});
