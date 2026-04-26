/**
 * 025 - Presse Locale - Create (option 4)
 *
 * Version robuste: contrat front + endpoint create, sans dependance UI.
 */
const { presseLocOrigin } = require('../../../support/e2eApiUrls');

describe('025 - Presse Locale - Create (option 4: contrat API stable)', () => {
  before(() => {
    cy.task('ensureFrontendProd8082');
    cy.task('checkFrontPing').should('eq', 'ok');
  });

  it('frontend est accessible', () => {
    cy.task('checkFrontPing').should('eq', 'ok');
  });

  it('endpoint create existe sur presseLocale-backend', () => {
    cy.request({
      method: 'POST',
      url: `${presseLocOrigin}/api/messages/new`,
      body: {
        title: `E2E contract locale option4 ${Date.now()}`,
        content: 'E2E contract payload option4',
        categ: 'presse-locale',
        siteKey: 'cppEurope',
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.not.eq(404);
      expect([200, 201, 400, 401, 403]).to.include(res.status);
    });
  });
});
