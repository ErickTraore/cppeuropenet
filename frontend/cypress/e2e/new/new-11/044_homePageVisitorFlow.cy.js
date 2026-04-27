/**
 * Tests visiteur — page Home (/#home) sans connexion :
 *   1. Chargement normal : heroText visible, 3 onglets, onglet 0 actif par défaut, carte visible, pas d'erreur.
 *   2. État d'erreur : GET /api/home-config 500 → .home-page__error affiché, aucun onglet rendu.
 *
 * Ces tests couvrent le chemin utilisateur lambda (sans authentification).
 * Pas de side-effect, pas de teardown nécessaire.
 */
describe('Home — visiteur anonyme : chargement normal et état d\'erreur', () => {
  it('visiteur anonyme — heroText visible, 3 onglets, onglet 0 actif par défaut, carte affichée', () => {
    cy.visit('/#home');

    cy.get('.home-page__error').should('not.exist');
    cy.get('.home-page__loading', { timeout: 20000 }).should('not.exist');

    cy.get('.home-page__hero p')
      .should('be.visible')
      .invoke('text')
      .should('not.be.empty');

    cy.get('.home-page__cat-btn').should('have.length', 3);
    cy.get('.home-page__cat-btn').eq(0).should('have.attr', 'aria-selected', 'true');
    cy.get('.home-page__cat-btn').eq(1).should('have.attr', 'aria-selected', 'false');
    cy.get('.home-page__cat-btn').eq(2).should('have.attr', 'aria-selected', 'false');

    cy.get('.home-page__card-img')
      .should('be.visible')
      .invoke('attr', 'src')
      .should('not.be.empty');
  });

  it('état d\'erreur — API /api/home-config 500 → .home-page__error affiché, pas d\'onglets', () => {
    cy.intercept('GET', '**/api/home-config', {
      statusCode: 500,
      body: { error: 'Erreur test E2E' },
    }).as('homeConfigError');

    cy.visit('/#home');
    cy.wait('@homeConfigError');

    cy.get('.home-page__error', { timeout: 10000 })
      .should('be.visible')
      .and('contain', 'Impossible de charger');

    cy.get('.home-page__cat-btn').should('not.exist');
  });
});
