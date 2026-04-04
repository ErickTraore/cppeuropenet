/**
 * 036 — Consulter après « création » article + vidéo (presse générale).
 * Upload vidéo via API multipart (Node) : le formulaire UI échoue souvent si REACT_APP_MEDIA_API
 * ne pointe pas vers un hôte joignable depuis le navigateur ; la page Consulter reste testée en réel.
 */
describe('036 - Presse générale — Consulter après création (option 3 vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 036 consultation presse générale option 3 : texte avec article vidéo sous Consulter.';

  let titre;

  before(() => {
    titre = 'E2E-CONSULT-G-OPT3-' + Date.now();
  });

  it('affiche la vidéo et le contenu sur /#newpresse', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseGeneraleMessage(token, titre, contenu).then((id) => {
        return cy.apiUploadPresseGeneraleVideo(token, id);
      });
    });

    cy.visit('/#newpresse');
    cy.contains('.presse__message--video-only .presse__message__header__title', titre, { timeout: 120000 }).should(
      'be.visible'
    );
    cy.contains('.presse__message--video-only .presse__message__header__title', titre)
      .closest('.presse__message--video-only')
      .find('video.presse__message__media__video')
      .should('be.visible');

    cy.expandPresseConsultCardByTitle(titre, { timeout: 120000 });
    cy.contains('.presse__message--video-only .presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseGeneraleByTitle(titre);
  });
});
