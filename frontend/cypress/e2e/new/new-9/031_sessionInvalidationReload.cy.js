/**
 * Session et rechargement : index.js réhydrate Redux depuis accessToken au chargement.
 * Avec un token en localStorage, F5 conserve menu + horloge ; sans token, écran non authentifié.
 */
describe('session au rechargement (réhydratation token)', () => {
  const { userOrigin: usersApiBase } = require('../../../support/e2eApiUrls');
  const loginUrl = `${usersApiBase}/api/users/login`;
  const loginEmail = 'admin2026@cppeurope.net';
  const loginPassword = 'admin2026!';

  it('après connexion, un rechargement conserve le shell si le token est toujours en localStorage', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.sessionStorage.clear();
      },
    });

    cy.get('div.App.not-authenticated', { timeout: 20000 }).should('exist');
    cy.get('.auth-container').should('exist');
    cy.get('.auth-title').should('contain', 'Je me connecte');

    cy.request({
      method: 'POST',
      url: loginUrl,
      body: { email: loginEmail, password: loginPassword },
    }).then((res) => {
      expect(res.status).to.eq(200);
      const token = res.body && res.body.accessToken;
      expect(token).to.be.a('string').and.not.be.empty;

      cy.visit('/#auth');
      cy.window().then((win) => {
        win.localStorage.setItem('accessToken', token);
      });
      cy.reload();
    });

    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('.App__header__actions__cadenas').should('exist');

    cy.reload();

    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('.App__header__actions__cadenas').should('be.visible');
    cy.get('nav.menu').should('exist');
  });
});
