/**
 * 035 — Après création option 2 (photo), Consulter : image décodée + titre + contenu déplié.
 */
describe('035 - Presse générale — Consulter après création (option 2 photo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 035 consultation presse générale option 2 : texte sous la carte image après dépliage.';

  let titre;

  before(() => {
    titre = 'E2E-CONSULT-G-OPT2-' + Date.now();
  });

  it('affiche image, titre et contenu sur /#newpresse', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-presse-generale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('#format', { timeout: 20000 }).select('article-photo');
    cy.get('input[name="title"]').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.get('input[type="file"][name="image"]').selectFile('cypress/fixtures/e2e-1x1.png', { force: true });
    cy.contains('button', '📸 Publier').click();
    cy.contains('✅ Article publié avec succès', { timeout: 120000 }).should('be.visible');

    cy.visit('/#newpresse');
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

    cy.cleanupPresseGeneraleByTitle(titre);
  });
});
