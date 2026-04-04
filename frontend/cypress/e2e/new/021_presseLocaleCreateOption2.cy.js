/**
 * 021 — Presse locale option 2 (photo) : parcours UI (upload → succès → getMedia même origine → Consulter).
 * Renommage API final pour la chaîne 022_delete (« titre remplacé Option2 »).
 * Aligné sur 012 (presse générale).
 */
describe('021 - Presse Locale - Create (option 2: UI photo + Consulter)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const apiBase = 'http://localhost:7005/api/messages/';
  const apiList = `${apiBase}?categ=presse-locale&siteKey=cppEurope`;
  const contenu =
    'E2E Contenu article avec photo presse locale. Texte suffisamment long pour les limites backend.';
  const titreRemplace = 'titre remplacé Option2';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";

  let titre;

  before(() => {
    titre = 'E2E UI Photo Presse Locale ' + Date.now();
  });

  it('publie article+photo, getMedia OK via proxy, image visible sous Consulter, puis titre pour 022', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-presse-locale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');
    cy.get('#format', { timeout: 20000 }).should('be.visible').select('article-photo');
    cy.get('input[name="title"]', { timeout: 20000 }).should('be.visible').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.get('input[type="file"][name="image"]').selectFile('cypress/fixtures/e2e-1x1.png', { force: true });

    cy.intercept('POST', '**/api/presse-locale/messages/new**').as('presseLocNew');
    cy.intercept('POST', '**/api/media-locale/uploadImage**').as('uploadImage');
    cy.contains('button', '📸 Publier').click();

    cy.wait('@presseLocNew', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@uploadImage', { timeout: 120000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.contains('✅ Article publié avec succès', { timeout: 120000 }).should('be.visible');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      const origin = win.location.origin;
      expect(token).to.be.a('string').and.not.be.empty;
      cy.request({
        method: 'GET',
        url: apiList,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = [...messages].reverse().find((m) => m.title === titre);
        expect(found, 'article retrouvé API').to.exist;
        cy.request({
          url: `${origin}/api/media-locale/getMedia/${found.id}`,
          headers: { Authorization: `Bearer ${token}` },
        }).then((gm) => {
          expect(gm.status, 'getMedia via même origine (proxy → mediaLocale)').to.eq(200);
          expect(gm.body).to.be.an('array').and.not.be.empty;
        });
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

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      cy.request({
        method: 'GET',
        url: apiList,
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => m.title === titre);
        expect(found).to.exist;
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
          expect(putRes.status).to.eq(200);
        });
      });
    });
  });
});
