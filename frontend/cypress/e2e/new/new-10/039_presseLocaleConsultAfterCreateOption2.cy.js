/**
 * 039 — Consulter après article + photo (presse locale).
 * Image attachée via API multipart (mediaLocale) pour fiabilité ; affichage vérifié sous /#newpresse-locale.
 */
describe('039 - Presse locale — Consulter après création (option 2 photo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 039 consultation presse locale option 2 : texte sous la carte image après dépliage.';

  let titre;

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 14) => {
    cy.dismissSessionModalIfPresent();
    cy.get('.presse__message__header__title', { timeout: 30000 }).should('exist');
    return cy.get('body', { timeout: 10000 }).then(($body) => {
      const exists = $body
        .find('.presse__message__header__title')
        .toArray()
        .some((el) => (el.textContent || '').trim() === expectedTitle);
      if (exists) return;
      if (attemptsLeft <= 1) {
        throw new Error(`titre introuvable dans Consulter locale: ${expectedTitle}`);
      }
      cy.wait(1500);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  before(() => {
    titre = 'E2E-CONSULT-L-OPT2-' + Date.now();
  });

  it('affiche image, titre et contenu sur /#newpresse-locale', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseLocaleMessage(token, titre, contenu).then((id) => {
        return cy.apiUploadPresseLocaleImage(token, id);
      });
    });

    cy.intercept('GET', '**/api/presse-locale/messages/**').as('localeMessagesList');
    cy.visit('/#newpresse-locale');
    cy.wait('@localeMessagesList', { timeout: 45000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      expect(status, 'GET presse-locale/messages répond 200').to.eq(200);

      waitForTitleInConsult(titre);
      cy.contains('.presse__message__header__title', titre, { timeout: 120000 }).should('be.visible');
      cy.expandPresseConsultCardByTitle(titre, { timeout: 90000 });
      cy.contains('.presse__message__content', contenu).should('be.visible');

      cy.contains('.presse__message__header__title', titre)
        .last()
        .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
        .find('img.presse__message__media__img', { timeout: 30000 })
        .should('be.visible')
        .should(($el) => {
          expect($el[0].naturalWidth, 'image décodée (mediaLocale local:7008)').to.be.greaterThan(0);
        });
    });

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
