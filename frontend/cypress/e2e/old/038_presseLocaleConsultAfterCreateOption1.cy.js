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

    cy.visit('/#admin-presse-locale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('#format', { timeout: 20000 }).should('be.visible').select('article');
    cy.get('input[name="title"]', { timeout: 20000 }).should('be.visible').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.contains('button', '🚀 Envoyer').click();
    cy.contains('Article publié avec succès', { timeout: 60000 }).should('be.visible');

    cy.visit('/#newpresse-locale');
    cy.contains('.presse__message--text-only .presse__message__header__title', titre, { timeout: 45000 }).should(
      'be.visible'
    );
    cy.expandPresseConsultCardByTitle(titre);
    cy.contains('.presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseLocaleByTitle(titre);
  });
});
