/**
 * 039 — Consulter après article + photo (presse locale).
 * Image attachée via API multipart (mediaLocale :7008) pour fiabilité ; affichage vérifié sous /#newpresse-locale.
 */
describe('039 - Presse locale — Consulter après création (option 2 photo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 039 consultation presse locale option 2 : texte sous la carte image après dépliage.';

  let titre;

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

    cy.visit('/#newpresse-locale');
    cy.contains('.presse__message--image-only .presse__message__header__title', titre, { timeout: 90000 }).should(
      'be.visible'
    );
    cy.contains('.presse__message--image-only .presse__message__header__title', titre)
      .closest('.presse__message--image-only')
      .find('img.presse__message__media__img')
      .should('be.visible')
      .should(($img) => {
        expect($img[0].naturalWidth, 'image décodée').to.be.greaterThan(0);
      });

    cy.expandPresseConsultCardByTitle(titre, { timeout: 90000 });
    cy.contains('.presse__message--image-only .presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
