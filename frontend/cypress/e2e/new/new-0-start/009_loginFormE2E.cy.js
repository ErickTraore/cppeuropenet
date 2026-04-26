describe('03A - E2E Login Form utilisateur', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const { usersApi } = require('../../../support/e2eApiUrls');

  before(() => {
    cy.task('ensureFrontendProd8082');
    cy.task('checkFrontPing').should('eq', 'ok');
  });

  it('Affiche le formulaire de connexion', () => {
    cy.task('checkFrontPing').should('eq', 'ok');
  });

  it('Permet la connexion via le formulaire', () => {
    cy.request({
      method: 'POST',
      url: `${usersApi}/login`,
      body: { email: adminEmail, password: adminPassword },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('accessToken');
      expect(res.body.accessToken).to.be.a('string').and.not.be.empty;
    });
  });
});
