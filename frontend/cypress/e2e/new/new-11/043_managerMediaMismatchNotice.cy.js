/**
 * Vérifie en mode Gérer que l'UI n'affiche pas "Texte seul" si le titre
 * indique un format média (ex: TITRE+PHOTO) mais que getMedia renvoie vide.
 */
describe('043 - Manager: incohérence média visible', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const fakeTitle = `E2E TITRE+PHOTO mismatch ${Date.now()}`;
  const fakeContent = 'Contenu E2E mismatch média (créé via API, sans upload).';
  let createdMessageId;

  it('affiche la note d\'incohérence et masque la note Texte seul', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'token admin').to.be.a('string').and.not.be.empty;
      return cy.apiCreatePresseGeneraleMessage(token, fakeTitle, fakeContent, 'article-photo').then((id) => {
        createdMessageId = id;
      });
    });

    cy.visit('/#presse-generale');
    cy.expectAuthenticatedShell();
    cy.contains('.admin-title', 'GESTION PRESSE', { timeout: 30000 }).should('be.visible');

    cy.contains('.message-id', `ID: ${createdMessageId}`, { timeout: 90000 }).should('be.visible');
    cy.contains('.message-id', `ID: ${createdMessageId}`)
      .parents('.message-card')
      .first()
      .find('button.btn-edit')
      .click({ force: true });

    cy.contains('.media-note', '⚠️ Incohérence: ce format attend un média', { timeout: 30000 }).should('be.visible');
    cy.contains('.media-note', 'type "Texte seul"').should('not.exist');

  });

  after(() => {
    cy.cleanupPresseGeneraleByTitle(fakeTitle);
  });
});
