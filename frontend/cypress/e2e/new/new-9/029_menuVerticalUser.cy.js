/**
 * Test E2E : menu vertical pour un utilisateur simple (non admin).
 * Vérifie que le menu hamburger affiche les bonnes entrées, sans sous‑menus admin.
 */
describe('menu vertical user', () => {
  const userEmail = 'user2026@cppeurope.net';
  const userPassword = 'user2026!';

  beforeEach(() => {
    cy.loginByUi(userEmail, userPassword);
    cy.dismissSessionModalIfPresent();
  });

  it("ouvre le menu au clic hamburger et affiche les entrées de base pour l'utilisateur", () => {
    cy.get('nav.menu').should('not.have.class', 'open');
    cy.get('.App__header__actions__hamburger button').click();
    cy.get('nav.menu.open').should('be.visible');

    cy.get('.menu__list').should('exist');
    cy.get('.menu__card').should('have.length.at.least', 4);

    cy.contains('.menu-link', 'Home').should('be.visible');
    cy.contains('.menu-link', 'Presse Générale').should('be.visible');
    cy.contains('.menu-link', 'Presse Locale').should('be.visible');
    cy.contains('.menu-link', 'Contact').should('be.visible');
    cy.contains('.menu-link', 'ProfilePage').should('be.visible');

    // Ne pas seulement lister les libellés : navigation réelle vers le profil (évite un smoke « menu vide »).
    cy.contains('.menu-link', 'ProfilePage').click();
    cy.url({ timeout: 15000 }).should('include', 'profilepage');
    cy.get('div.App.authenticated', { timeout: 15000 }).should('exist');
  });

  it("n'affiche pas les sous‑menus admin (pas de boutons 'Gérer / Créer' dans le menu vertical)", () => {
    cy.get('.App__header__actions__hamburger button').click();
    cy.get('nav.menu.open').should('be.visible');

    cy.get('.menu__card.has-submenu').should('not.exist');
    cy.get('.submenu-toggle').should('not.exist');
    cy.get('.submenu').should('not.exist');
  });
});
