/**
 * 014 — Presse générale option 3 (vidéo) : parcours UI (upload → succès → getMedia même origine → Consulter).
 * Renommage API final pour la chaîne 015_delete (« titre remplacé Option3 »).
 * Aligné sur 012 / 016 (même famille que 021 / 025 presse locale).
 */
describe('014 - Presse Générale - Create (option 3: UI vidéo + Consulter)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const { presseGenMessages: apiMessages } = require('../../support/e2eApiUrls');
  const contenu =
    'E2E Contenu article avec vidéo presse générale. Texte suffisamment long pour les limites backend.';
  const titreRemplace = 'titre remplacé Option3';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";

  let titre;

  before(() => {
    titre = 'E2E UI Vidéo Presse ' + Date.now();
  });

  it('publie article+vidéo, getMedia OK via proxy, vidéo visible sous Consulter, puis titre pour 015', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-presse-generale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('#format', { timeout: 20000 }).should('be.visible').select('article-video');
    cy.get('input[name="title"]', { timeout: 20000 }).should('be.visible').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.get('input[type="file"][name="video"]').selectFile('cypress/fixtures/videos/video-e2e-ui-small.mp4', {
      force: true,
    });

    cy.intercept('POST', '**/messages/new*').as('presseNew');
    cy.intercept('POST', '**/uploadVideo*').as('uploadVideo');
    cy.contains('button', '📨 Publier').click();

    cy.wait('@presseNew', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@uploadVideo', { timeout: 300000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.contains('✅ Article publié avec succès', { timeout: 180000 }).should('be.visible');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      const origin = win.location.origin;
      expect(token).to.be.a('string').and.not.be.empty;
      cy.request({
        method: 'GET',
        url: apiMessages,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = [...messages].reverse().find((m) => m.title === titre);
        expect(found, 'article retrouvé API').to.exist;
        cy.request({
          url: `${origin}/api/media/getMedia/${found.id}`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((gm) => {
          expect(gm.status, 'getMedia via même origine (proxy → mediaGle)').to.eq(200);
          expect(gm.body).to.be.an('array').and.not.be.empty;
        });
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

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      cy.request({
        method: 'GET',
        url: apiMessages,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => m.title === titre);
        expect(found).to.exist;
        cy.request({
          method: 'PUT',
          url: apiMessages + found.id,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: { ...found, title: titreRemplace, content: contenuRemplace },
        }).then((putRes) => {
          expect(putRes.status).to.eq(200);
        });
      });
    });
  });
});
