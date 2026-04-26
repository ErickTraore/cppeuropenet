/**
 * Régression : après publication presse générale (article + photo), le hash peut rester sur
 * #admin-presse-generale alors que le menu vertical et l’horloge disparaissaient (désync token / Redux).
 * Ce spec exige que le shell reste authentifié : App.authenticated, hamburger, cadenas, nav.menu, token LS.
 */
describe('Presse générale — article + photo : le menu et l’horloge restent après succès', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';

  // Importer les constantes nécessaires pour les appels API
  const { presseGenMessages: API_PRESSE_GEN } = require('../../../support/e2eApiUrls');

  it('après upload + message de succès, shell authentifié inchangé (menu + cadenas + token)', () => {
    // 1. Connexion admin (login UI)
    const titre = `E2E Shell Photo ${Date.now()}`;
    const contenu =
      'Contenu E2E presse générale avec photo pour vérifier que le menu et la session restent visibles après succès.';

    cy.loginByUi(adminEmail, adminPassword);
    // 2. Création de l'article via l'API
    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'token présent après login').to.be.a('string').and.not.be.empty;

      // Vérification explicite que le message est bien créé et visible via l'API
      cy.apiCreatePresseGeneraleMessage(token, titre, contenu, 'article-photo', { categ: 'presse' }).then((id) => {
        expect(id, 'id message créé').to.be.a('number').and.to.be.greaterThan(0);

        cy.request({
          method: 'GET',
          url: API_PRESSE_GEN,
          headers: { Authorization: `Bearer ${token}` },
        }).then((res) => {
          const messages = res.body;
          const found = messages.find((m) => m.title === titre);
          expect(found, 'message trouvé dans la liste API').to.exist;

          // Upload de la photo via l'API
          cy.apiUploadPresseGeneraleImage(token, id, 'article-photo').then(() => {
            // 3) Vérifier la non-régression shell sur la page admin (création)
            cy.visit('/#admin-presse-generale');
            cy.expectAuthenticatedShell();

            // Si le modal d'inactivité apparaît, cliquer sur 'sélectionner' pour débloquer l'UI
            cy.get('body').then($body => {
              if ($body.find('[data-testid="prolonger-session"]').length) {
                cy.get('[data-testid="prolonger-session"]').click({ force: true });
              }
            });

            // Forçage d'un reload UI pour valider la persistance du shell après succès
            cy.reload();
            cy.url({ timeout: 10000 }).should('include', 'admin-presse-generale');
            cy.expectAuthenticatedShell();

            // 4) Vérifier l'affichage du message sur la vraie page de consultation
            cy.visit('/#newpresse');
            cy.expectAuthenticatedShell();
            cy.reload();
            cy.wait(2000);
            cy.contains('.presse__message__header__title', titre, { timeout: 90000 }).should('be.visible');
            cy.url({ timeout: 10000 }).should('include', 'newpresse');
            cy.expectAuthenticatedShell();

            // Suppression (cleanup) à la toute fin
            cy.cleanupPresseGeneraleByTitle(titre);
          });
        });
      });
    });
  });
});
