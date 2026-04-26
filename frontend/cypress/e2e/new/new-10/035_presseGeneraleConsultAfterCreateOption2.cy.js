/**
 * 035 — Après création option 2 (photo), Consulter : image décodée + titre + contenu déplié.
 */
describe('035 - Presse générale — Consulter après création (option 2 photo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 035 consultation presse générale option 2 : texte sous la carte image après dépliage.';

  let titre;

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 12) => {
    cy.dismissSessionModalIfPresent();
    cy.get('.presse__message__header__title', { timeout: 30000 }).should('exist');
    return cy.get('body', { timeout: 10000 }).then(($body) => {
      const exists = $body
        .find('.presse__message__header__title')
        .toArray()
        .some((el) => (el.textContent || '').trim() === expectedTitle);
      if (exists) return;
      if (attemptsLeft <= 1) {
        throw new Error(`titre introuvable dans Consulter: ${expectedTitle}`);
      }
      cy.wait(1500);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  before(() => {
    titre = 'E2E-CONSULT-G-OPT2-' + Date.now();
  });

  it('affiche image, titre et contenu sur /#newpresse', () => {
    // 1. Connexion admin (login UI)
    cy.loginByUi(adminEmail, adminPassword);
    // 2. Création de l'article via l'API
    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'token présent après login').to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseGeneraleMessage(token, titre, contenu, 'article-photo').then((id) => {
        expect(id, 'id message créé').to.be.a('number').and.to.be.greaterThan(0);
        // 3. Upload de la photo via l'API
        return cy.apiUploadPresseGeneraleImage(token, id, 'article-photo').then((uploadRes) => {
          // 4. Consultation dans l'UI
          cy.visit('/#newpresse');
          waitForTitleInConsult(titre);
          cy.contains('.presse__message__header__title', titre, { timeout: 90000 }).should('be.visible');
          cy.contains('.presse__message__header__title', titre)
            .last()
            .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
            .as('photoCard');

          cy.get('@photoCard').find('img.presse__message__media__img', { timeout: 30000 }).should('be.visible').should(($el) => {
            expect($el[0].naturalWidth, 'image décodée (mediaGle local:7004)').to.be.greaterThan(0);
          });

          cy.expandPresseConsultCardByTitle(titre, { timeout: 90000 });
          cy.contains('.presse__message__content', contenu).should('be.visible');

          cy.get('@photoCard').scrollIntoView().should('be.visible').screenshot('newpresse-photo-card-visible-035');

          // 5. Suppression (cleanup) à la toute fin
          cy.cleanupPresseGeneraleByTitle(titre);
        });
      });
    });
  });
});
