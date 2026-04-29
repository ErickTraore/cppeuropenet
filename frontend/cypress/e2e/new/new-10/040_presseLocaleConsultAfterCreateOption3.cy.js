/**
 * 040 — Consulter après article + vidéo (presse locale). Média via API ; vue Consulter dans le navigateur.
 */
describe('040 - Presse locale — Consulter après création (option 3 vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 040 consultation presse locale option 3 : texte avec article vidéo sous Consulter.';

  let titre;

  const waitForTitleInConsult = (expectedTitle, attemptsLeft = 16) => {
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
    titre = 'E2E-CONSULT-L-OPT3-' + Date.now();
  });

  const waitForLocaleMediaReady = (id, attemptsLeft = 10) => {
    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      const origin = win.location.origin;
      cy.request({
        url: `${origin}/api/media-locale/getMedia/${id}`,
        headers: { Authorization: `Bearer ${token}` },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status === 200) return;
        if (attemptsLeft <= 1) {
          expect(res.status, 'media-locale/getMedia doit finir en 200').to.eq(200);
        }
        cy.wait(1200);
        return waitForLocaleMediaReady(id, attemptsLeft - 1);
      });
    });
  };

  it('affiche la vidéo et le contenu sur /#newpresse-locale', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseLocaleMessage(token, titre, contenu).then((id) => {
        cy.wrap(id).as('presseLocVideoId');
        return cy.apiUploadPresseLocaleVideo(token, id);
      });
    });

    cy.get('@presseLocVideoId').then((id) => waitForLocaleMediaReady(id));

    cy.intercept('GET', '**/api/presse-locale/messages/**').as('localeMessagesList');
    cy.visit('/#newpresse-locale');
    cy.wait('@localeMessagesList', { timeout: 45000 }).then((interception) => {
      const status = interception && interception.response ? interception.response.statusCode : -1;
      expect(status, 'GET presse-locale/messages répond 200/304').to.be.oneOf([200, 304]);

      waitForTitleInConsult(titre);
      cy.dismissSessionModalIfPresent();
      cy.contains('.presse__message__header__title', titre, { timeout: 180000 }).should('be.visible');
      cy.expandPresseConsultCardByTitle(titre, { timeout: 120000 });
      cy.contains('.presse__message__content', contenu).should('be.visible');

      cy.contains('.presse__message__header__title', titre)
        .last()
        .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
        .find('video.presse__message__media__video', { timeout: 30000 })
        .should('be.visible')
        .should(($v) => {
          expect($v[0].currentSrc, 'src vidéo locale').to.match(/\.mp4$/);
        });
    });

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
