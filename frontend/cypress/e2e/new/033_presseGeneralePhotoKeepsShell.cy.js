/**
 * Régression : après publication presse générale (article + photo), le hash peut rester sur
 * #admin-presse-generale alors que le menu vertical et l’horloge disparaissaient (désync token / Redux).
 * Ce spec exige que le shell reste authentifié : App.authenticated, hamburger, cadenas, nav.menu, token LS.
 */
describe('Presse générale — article + photo : le menu et l’horloge restent après succès', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';

  beforeEach(() => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();
  });

  it('après upload + message de succès, shell authentifié inchangé (menu + cadenas + token)', () => {
    const titre = `E2E Shell Photo ${Date.now()}`;
    const contenu =
      'Contenu E2E presse générale avec photo pour vérifier que le menu et la session restent visibles après succès.';

    cy.visit('/#admin-presse-generale');
    cy.expectAuthenticatedShell();

    cy.get('#format', { timeout: 20000 }).should('be.visible').select('article-photo');
    cy.get('input[name="title"]', { timeout: 20000 }).should('be.visible').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);

    cy.get('input[type="file"][name="image"]').selectFile('cypress/fixtures/e2e-1x1.png', { force: true });

    cy.intercept('POST', '**/messages/new*').as('presseNew');
    cy.intercept('POST', '**/uploadImage*').as('uploadImage');
    cy.contains('button', '📸 Publier').click();

    cy.wait('@presseNew', { timeout: 60000 });
    cy.wait('@uploadImage', { timeout: 120000 });

    cy.contains('✅ Article publié avec succès', { timeout: 120000 }).should('be.visible');

    cy.url({ timeout: 10000 }).should('include', 'admin-presse-generale');
    cy.expectAuthenticatedShell();
  });
});
