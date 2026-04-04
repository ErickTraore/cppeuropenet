/**
 * 019 — Presse locale option 1 (texte) : parcours UI (création → Consulter).
 * Renommage API final pour la chaîne 020_delete (« titre remplacé »).
 * Aligné sur 010 (presse générale).
 */
describe('019 - Presse Locale - Create (option 1: UI + Consulter)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const apiBase = 'http://localhost:7005/api/messages/';
  const apiList = `${apiBase}?categ=presse-locale&siteKey=cppEurope`;
  const contenu =
    'E2E Contenu article presse locale. Texte suffisamment long pour les limites backend.';
  const titreRemplace = 'titre remplacé';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";

  let titre;

  before(() => {
    titre = 'E2E UI Presse Locale ' + Date.now();
  });

  it('publie via le formulaire, voit le titre sous Consulter, puis aligne le titre pour 020 (API)', () => {
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
    cy.contains('✅ Article publié avec succès', { timeout: 8000 }).should('exist');

    cy.visit('/#newpresse-locale');
    cy.contains('.presse__message--text-only .presse__message__header__title', titre, { timeout: 45000 }).should(
      'be.visible'
    );

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token).to.be.a('string').and.not.be.empty;
      cy.request({
        method: 'GET',
        url: apiList,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        expect(res.status).to.eq(200);
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => m.title === titre);
        expect(found, 'message créé retrouvé en API').to.exist;
        cy.request({
          method: 'PUT',
          url: apiBase + found.id,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: {
            ...found,
            title: titreRemplace,
            content: contenuRemplace,
            categ: 'presse-locale',
            siteKey: 'cppEurope',
          },
        }).then((putRes) => {
          expect(putRes.status).to.be.oneOf([200, 204]);
        });
      });
    });
  });
});
