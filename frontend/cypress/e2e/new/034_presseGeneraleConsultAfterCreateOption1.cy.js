/**
 * 034 — Après création option 1 (texte), la page Consulter affiche le titre et le contenu.
 * Nettoyage API pour ne pas polluer les chaînes 010/011.
 */
describe('034 - Presse générale — Consulter après création (option 1)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const contenu =
    'E2E 034 consultation presse générale option 1 : contenu affiché sous Consulter après création.';

  let titre;

  before(() => {
    titre = 'E2E-CONSULT-G-OPT1-' + Date.now();
  });

  it('affiche le titre et le contenu sur /#newpresse', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-presse-generale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('#format', { timeout: 20000 }).should('be.visible').select('article');
    cy.get('input[name="title"]', { timeout: 20000 }).should('be.visible').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.contains('button', '🚀 Envoyer').click();
    cy.contains('Article publié avec succès', { timeout: 60000 }).should('be.visible');

    cy.visit('/#newpresse');
    cy.contains('.presse__message--text-only .presse__message__header__title', titre, { timeout: 45000 }).should(
      'be.visible'
    );
    cy.expandPresseConsultCardByTitle(titre);
    cy.contains('.presse__message__content', contenu).should('be.visible');

    cy.cleanupPresseGeneraleByTitle(titre);
  });
});
