/**
 * Session et rechargement : index.js réhydrate Redux depuis accessToken au chargement.
 * Avec un token en localStorage, F5 conserve menu + horloge ; sans token, écran non authentifié.
 */
describe('session au rechargement (réhydratation token)', () => {
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

    cy.intercept('POST', '**/api/users/login').as('loginPost');
    cy.get('input[type="email"][placeholder="Email"]', { timeout: 20000 }).clear().type(loginEmail);
    cy.get('input[type="password"][placeholder="Mot de passe"]', { timeout: 20000 }).clear().type(loginPassword);
    cy.get('button.auth-submit').contains('Se connecter').click();
    cy.wait('@loginPost', { timeout: 45000 });
    cy.window({ timeout: 30000 }).should((win) => {
      expect(win.localStorage.getItem('accessToken')).to.be.a('string').and.not.be.empty;
    });

    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('.App__header__actions__cadenas').should('exist');

    cy.reload();

    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('.App__header__actions__cadenas').should('be.visible');
    cy.get('nav.menu').should('exist');
  });
});
