/**
 * Test E2E : menu vertical admin (cadres arrondis, bandeau blanc, structure moderne).
 * Vérifie que le menu s'ouvre et affiche les entrées attendues avec la nouvelle maquette.
 */
describe('menu vertical admin', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';

  beforeEach(() => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();
  });

  it('ouvre le menu au clic hamburger et affiche les cadres (menu__card) avec les entrées attendues', () => {
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
  });

  it('affiche les sous-menus Presse Générale et Presse Locale (Gérer, Consulter, Créer)', () => {
    cy.get('.App__header__actions__hamburger button').click();
    cy.get('nav.menu.open').should('be.visible');

    cy.get('.menu__card.has-submenu').contains('Presse Générale').parents('.menu__card').within(() => {
      cy.get('.submenu-toggle').click();
    });
    cy.get('.menu__card.has-submenu.open .submenu').should('be.visible');
    cy.get('.menu__card.has-submenu.open .submenu-link').should('have.length', 3);
    cy.contains('.submenu-link', 'Gérer').should('be.visible');
    cy.contains('.submenu-link', 'Consulter').should('be.visible');
    cy.contains('.submenu-link', 'Créer').should('be.visible');
  });
});
