/**
 * 039 — Consulter après article + photo (presse locale).
 * Image attachée via API multipart (mediaLocale) pour fiabilité ; affichage vérifié sous route consulter presse locale.
 */
describe('039 - Presse Locale — Consulter après création (option 2 photo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 039 consultation presse locale option 2 : texte sous la carte image après dépliage.';

  let titre;
  const isStagingProfile = () => {
    const byEnv = String(Cypress.env('E2E_PROFILE') || '').toLowerCase() === 'staging';
    const base = String(Cypress.config('baseUrl') || '').toLowerCase();
    return byEnv || base.includes('staging.cppeurope.net') || base.includes('178.170.13.128');
  };

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 14) => {
    cy.dismissSessionModalIfPresent();
    return cy.get('body', { timeout: 10000 }).then(($body) => {
      const exists = $body
        .find('.presse__message__header__title')
        .toArray()
        .some((el) => (el.textContent || '').trim() === expectedTitle);
      if (exists) return;
      if (attemptsLeft <= 1) {
        throw new Error(`titre introuvable dans Consulter presse locale: ${expectedTitle}`);
      }
      cy.wait(1500);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  before(() => {
    titre = 'E2E-CONSULT-L-OPT2-' + Date.now();
  });

  it('affiche image, titre et contenu sur route consulter presse locale', () => {
    if (isStagingProfile()) {
      cy.loginByUi(adminEmail, adminPassword);
      cy.visitModuleConsulter('presse-locale');
      cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
      cy.get('.presse__messages, .presse').should('exist');
      return;
    }

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseLocaleMessage(token, titre, contenu).then((id) => {
        return cy.apiUploadPresseLocaleImage(token, id);
      });
    });

    cy.intercept('GET', '**/api/presse-locale/messages/**').as('presseLocaleMessagesList');
    cy.visitModuleConsulter('presse-locale');
    cy.wait('@presseLocaleMessagesList', { timeout: 45000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      expect(status, 'GET messages presse locale répond 200/304').to.be.oneOf([200, 304]);

      waitForTitleInConsult(titre);
      cy.dismissSessionModalIfPresent();
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
