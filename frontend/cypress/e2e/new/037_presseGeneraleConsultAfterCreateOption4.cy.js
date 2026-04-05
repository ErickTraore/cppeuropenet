/**
 * 037 — Consulter après article + miniature + vidéo (presse générale).
 * Médias injectés via API multipart ; vue Consulter validée dans le navigateur.
 */
describe('037 - Presse générale — Consulter après création (option 4 miniature + vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 037 consultation presse générale option 4 : texte avec miniature et vidéo sous Consulter.';

  let titre;

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
        .apiCreatePresseGeneraleMessage(token, titre, contenu, 'article-thumbnail-video')
        .then((id) =>
          cy.apiUploadPresseGeneraleImage(token, id).then(() => cy.apiUploadPresseGeneraleVideo(token, id))
        );
    });

    cy.visit('/#newpresse');
    cy.contains('.presse__message--image-and-video .presse__message__header__title', titre, {
      timeout: 120000,
    }).should('be.visible');
    cy.contains('.presse__message--image-and-video .presse__message__header__title', titre)
      .closest('.presse__message--image-and-video')
      .find('video.presse__message__media__video')
      .should('be.visible')
      .should(($v) => {
        expect(($v.attr('poster') || '').length, 'poster miniature').to.be.greaterThan(4);
      });

    cy.expandPresseConsultCardByTitle(titre, { timeout: 120000 });
    cy.contains('.presse__message--image-and-video .presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseGeneraleByTitle(titre);
  });
});
