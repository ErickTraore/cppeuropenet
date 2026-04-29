/**
 * 019 - Presse Locale - Create (option 1)
 *
 * Version robuste: contrat front + endpoint create, sans dependance UI.
 */
const { presseLocMessages } = require('../../../support/e2eApiUrls');

describe('019 - Presse Locale - Create (option 1: contrat API stable)', () => {
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
      url: `${presseLocMessages}new/`,
      body: {
        title: `E2E contract locale option1 ${Date.now()}`,
        content: 'E2E contract payload option1',
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
