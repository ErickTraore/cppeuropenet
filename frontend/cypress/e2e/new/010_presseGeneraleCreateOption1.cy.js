/**
 * Presse générale — option 1 (texte) : parcours réel UI (création → Consulter).
 * Le renommage final via API garde la chaîne avec 011_delete (titre exact « titre remplacé »).
 */
describe('010 - Presse Générale - Create (option 1: UI + Consulter)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const usersApi = 'http://localhost:7001/api/users';
  const apiMessages = 'http://localhost:7012/api/messages/';
  const contenu =
    'E2E Contenu article presse générale. Texte suffisamment long pour les limites backend.';
  const titreRemplace = 'titre remplacé';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";

  let titre;

  before(() => {
    titre = 'E2E UI Presse ' + Date.now();
  });

  it('publie via le formulaire, voit le titre sous Consulter, puis aligne le titre pour 011 (API)', () => {
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
    cy.contains('.presse__message__header__title', titre, { timeout: 45000 }).should('be.visible');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      cy.request({
        method: 'GET',
        url: apiMessages,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => m.title === titre);
        expect(found, 'message créé retrouvé en API').to.exist;
        cy.request({
          method: 'PUT',
          url: apiMessages + found.id,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: {
            ...found,
            title: titreRemplace,
            content: contenuRemplace,
          },
        }).then((putRes) => {
          expect(putRes.status).to.be.oneOf([200, 204]);
        });
      });
    });
  });
});
