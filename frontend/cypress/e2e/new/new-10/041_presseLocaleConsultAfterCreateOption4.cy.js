/**
 * 041 — Consulter après article + miniature + vidéo (presse locale).
 * Médias injectés via API multipart (mediaLocale) ; vue Consulter alignée sur 037 (presse générale).
 */
describe('041 - Presse locale — Consulter après création (option 4 miniature + vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 041 consultation presse locale option 4 : texte avec miniature et vidéo sous Consulter.';

  let titre;

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 14) => {
    cy.dismissSessionModalIfPresent();
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
    titre = 'E2E-CONSULT-L-OPT4-' + Date.now();
  });

  it('affiche média combiné et le contenu sur /#newpresse-locale', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseLocaleMessage(token, titre, contenu).then((id) => {
        return cy.apiUploadPresseLocaleImage(token, id).then(() => cy.apiUploadPresseLocaleVideo(token, id));
      });
    });

    cy.intercept('GET', '**/api/presse-locale/messages/**').as('localeMessagesList');
    cy.visit('/#newpresse-locale');
    cy.wait('@localeMessagesList', { timeout: 45000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      expect(status, 'GET presse-locale/messages répond 200/304').to.be.oneOf([200, 304]);

      waitForTitleInConsult(titre);
      cy.dismissSessionModalIfPresent();
      cy.contains('.presse__message__header__title', titre, { timeout: 120000 }).should('be.visible');
      cy.expandPresseConsultCardByTitle(titre, { timeout: 120000 });
      cy.contains('.presse__message__content', contenu).should('be.visible');

      cy.contains('.presse__message__header__title', titre)
        .last()
        .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
        .find('video.presse__message__media__video', { timeout: 30000 })
        .should('be.visible')
        .should(($v) => {
          expect(($v.attr('poster') || '').length, 'poster miniature').to.be.greaterThan(4);
        });
    });

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
