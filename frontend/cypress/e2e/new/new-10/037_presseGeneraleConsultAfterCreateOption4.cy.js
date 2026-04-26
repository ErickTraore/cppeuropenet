/**
 * 037 — Consulter après article + miniature + vidéo (presse générale).
 * Médias injectés via API multipart ; vue Consulter validée dans le navigateur.
 */
describe('037 - Presse générale — Consulter après création (option 4 miniature + vidéo)', () => {
  const { presseGenMessages } = require('../../../support/e2eApiUrls');
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 037 consultation presse générale option 4 : texte avec miniature et vidéo sous Consulter.';

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
        throw new Error(`titre introuvable dans Consulter: ${expectedTitle}`);
      }
      cy.wait(1500);
      cy.reload();
      return waitForTitleInConsult(expectedTitle, attemptsLeft - 1);
    });
  };

  before(() => {
    titre = 'E2E-CONSULT-G-OPT4-' + Date.now();
  });

  it('affiche média combiné et le contenu sur /#newpresse', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy
        .request({
          method: 'POST',
          url: `${presseGenMessages}new/`,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: { title: titre, content: contenu, categ: 'presse', format: 'article-thumbnail-video' },
          failOnStatusCode: false,
        })
        .then((createRes) => {
          expect(createRes.status, 'création article miniature+vidéo').to.be.oneOf([200, 201]);
          const id = createRes.body && createRes.body.id;
          expect(id, 'id message créé').to.be.a('number');
          return cy
            .apiUploadPresseGeneraleImage(token, id)
            .then(() => cy.apiUploadPresseGeneraleVideo(token, id));
        });
    });

    cy.visit('/#newpresse');
    waitForTitleInConsult(titre);
    cy.contains('.presse__message__header__title', titre, { timeout: 120000 }).should('be.visible');
    cy.contains('.presse__message__header__title', titre)
      .last()
      .closest('.presse__message--text-only, .presse__message--image-only, .presse__message--video-only, .presse__message--image-and-video')
      .as('thumbVideoCard');

    cy.get('@thumbVideoCard').find('video.presse__message__media__video', { timeout: 30000 }).should('be.visible').should(($v) => {
      expect(($v.attr('poster') || '').length, 'poster miniature').to.be.greaterThan(4);
    });

    cy.expandPresseConsultCardByTitle(titre, { timeout: 120000 });
    cy.contains('.presse__message__content', contenu).should('be.visible');
    cy.cleanupPresseGeneraleByTitle(titre);
  });
});
