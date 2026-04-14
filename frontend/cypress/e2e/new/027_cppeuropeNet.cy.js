/**
 * Test E2E Cypress : cppeurope.net
 * Vérifie que la page d'accueil affiche le header et le contenu auth attendus.
 */
describe('cppeurope.net', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('affiche la page avec App non authentifié, header et formulaire de connexion', () => {
    // Racine : App not-authenticated
    cy.get('div.App.not-authenticated').should('exist');

    // Header
    cy.get('header.App__header').should('exist');

    // Logo
    cy.get('.App__header__logo').should('exist');
    cy.get('.App__header__logo__img').should('have.attr', 'alt', 'logo');
    cy.get('.App__header__logo__img').invoke('attr', 'src').should('include', 'logoppaci');

    // Panneau (textes du header)
    cy.get('.App__header__panneau').within(() => {
      cy.get('.App__header__panneau__text-1').should('contain', 'Parti des Peuples Africains');
      cy.get('.App__header__panneau__text-2').should('contain', 'Conseil Politique Permanent Europe');
    });

    // Hamburger
    cy.get('.App__header__actions__hamburger').should('exist');

    // Zone contenu + auth
    cy.get('.content').should('exist');
    cy.get('.auth-container').should('exist');

    // Toggle Connexion / Inscription
    cy.get('.auth-toggle').within(() => {
      cy.contains('button', 'Connexion').should('exist');
      cy.contains('button', 'Inscription').should('exist');
    });
    cy.get('.auth-toggle button.active').should('contain', 'Connexion');

    // Formulaire de connexion
    cy.get('.auth-form').should('exist');
    cy.get('.auth-title').should('contain', 'Je me connecte');
    cy.get('form.login-form').should('exist');
    cy.get('.auth-input-group input[type="email"][placeholder="Email"]').should('exist');
    cy.get('.auth-input-group input[type="password"][placeholder="Mot de passe"]').should('exist');
    cy.get('.auth-toggle-visibility').should('exist');
    cy.get('#rememberMe').should('exist');
    cy.get('label[for="rememberMe"]').should('contain', 'Se souvenir de moi');
    cy.get('button.auth-submit').should('contain', 'Se connecter');

    // Footer
    cy.get('.footer').should('exist');
    cy.get('footer.footer-container').should('exist');
    cy.get('.footer-container-header').within(() => {
      cy.contains('h5', /© 2025 Copyright: EburniCom/).should('exist');
    });
  });
});
