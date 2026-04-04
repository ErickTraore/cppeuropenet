describe('03A - E2E Login Form utilisateur', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';

  it('Affiche le formulaire de connexion', () => {
    cy.visit('/#auth');
    cy.get('.auth-container').should('exist');
    cy.get('form.login-form').should('exist');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
  });

  it('Permet la connexion via le formulaire', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.url({ timeout: 30000 }).should('include', '#home');
    cy.window().then((win) => {
      expect(win.localStorage.getItem('accessToken')).to.exist;
    });
  });
});
