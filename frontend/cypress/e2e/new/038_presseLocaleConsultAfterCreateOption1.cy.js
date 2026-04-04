/**
 * 038 — Après création presse locale option 1 (texte), /#newpresse-locale affiche titre + contenu.
 */
describe('038 - Presse locale — Consulter après création (option 1)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 038 consultation presse locale option 1 : contenu affiché sous Consulter après création.';

  let titre;

  before(() => {
    titre = 'E2E-CONSULT-L-OPT1-' + Date.now();
  });

  it('affiche le titre et le contenu sur /#newpresse-locale', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.intercept('POST', '**/api/presse-locale/messages/new**').as('presseLocMsgNew');

    cy.visit('/#admin-presse-locale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('#format', { timeout: 20000 }).should('be.visible').select('article');
    cy.get('input[name="title"]', { timeout: 20000 }).should('be.visible').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.contains('button', '🚀 Envoyer').click();
    cy.wait('@presseLocMsgNew', { timeout: 120000 })
      .its('response.statusCode')
      .should('be.oneOf', [200, 201]);
    // Le composant efface le message vert après 5s — ne pas s’y fier seul pour l’assertion.
    cy.contains('✅ Article publié avec succès', { timeout: 8000 }).should('exist');

    cy.visit('/#newpresse-locale');
    cy.contains('.presse__message--text-only .presse__message__header__title', titre, { timeout: 45000 }).should(
      'be.visible'
    );
    cy.contains('.presse__message--text-only .presse__message__header__title', titre)
      .closest('.presse__message--text-only')
      .find('img.presse__message__media__img')
      .should('not.exist');
    cy.contains('.presse__message--text-only .presse__message__header__title', titre)
      .closest('.presse__message--text-only')
      .find('video.presse__message__media__video')
      .should('not.exist');
    // La liste enrichit les médias en async : attendre pour éviter un faux vert si l’UI bascule ensuite.
    cy.wait(4000);
    cy.contains('.presse__message--text-only .presse__message__header__title', titre).should('be.visible');
    cy.contains('.presse__message--text-only .presse__message__header__title', titre)
      .closest('.presse__message--text-only')
      .find('img.presse__message__media__img')
      .should('not.exist');
    cy.contains('.presse__message--text-only .presse__message__header__title', titre)
      .closest('.presse__message--text-only')
      .find('video.presse__message__media__video')
      .should('not.exist');

    cy.expandPresseConsultCardByTitle(titre);
    cy.contains('.presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
