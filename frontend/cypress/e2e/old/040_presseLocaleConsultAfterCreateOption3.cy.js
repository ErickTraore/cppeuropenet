/**
 * 040 — Consulter après article + vidéo (presse locale). Média via API ; vue Consulter dans le navigateur.
 */
describe('040 - Presse locale — Consulter après création (option 3 vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 040 consultation presse locale option 3 : texte avec article vidéo sous Consulter.';

  let titre;

  before(() => {
    titre = 'E2E-CONSULT-L-OPT3-' + Date.now();
  });

  it('affiche la vidéo et le contenu sur /#newpresse-locale', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseLocaleMessage(token, titre, contenu).then((id) => {
        return cy.apiUploadPresseLocaleVideo(token, id);
      });
    });

    cy.visit('/#newpresse-locale');
    cy.contains('.presse__message--video-only .presse__message__header__title', titre, { timeout: 120000 }).should(
      'be.visible'
    );
    cy.contains('.presse__message--video-only .presse__message__header__title', titre)
      .closest('.presse__message--video-only')
      .find('video.presse__message__media__video')
      .should('be.visible');

    cy.expandPresseConsultCardByTitle(titre, { timeout: 120000 });
    cy.contains('.presse__message--video-only .presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
