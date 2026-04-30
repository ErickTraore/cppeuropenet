/**
 * 014 - Presse Générale - Create (option 3)
 *
 * Version robuste: contrat front + endpoint create, sans dépendance cy.visit.
 */
const { presseGenOrigin, presseGenMessages } = require('../../../support/e2eApiUrls');

describe('014 - Presse Générale - Create (option 3: contrat API stable)', () => {
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
      url: `${presseGenMessages}new`,
      body: {
        title: `E2E contract option3 ${Date.now()}`,
        content: 'E2E contract payload option3',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.not.eq(404);
      expect([401, 403]).to.include(res.status);
    });
  });
});
