/**
 * Presse générale — option 2 (photo) : parcours réel UI (upload → succès → getMedia même origine → Consulter + pixels).
 * Renommage API final pour la chaîne 013_delete (« titre remplacé Option2 »).
 */
describe('012 - Presse Générale - Create (option 2: UI photo + Consulter)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const usersApi = 'http://localhost:7001/api/users';
  const apiMessages = 'http://localhost:7012/api/messages/';
  const contenu =
    'E2E Contenu article avec photo. Texte suffisamment long pour les limites backend.';
  const titreRemplace = 'titre remplacé Option2';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";

  let titre;

  before(() => {
    titre = 'E2E UI Photo Presse ' + Date.now();
  });

  it('publie article+photo, getMedia OK via proxy, image visible sous Consulter, puis titre pour 013', () => {
    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-presse-generale');
    cy.get('#format', { timeout: 20000 }).select('article-photo');
    cy.get('input[name="title"]').clear().type(titre);
    cy.get('textarea[name="content"]').clear().type(contenu);
    cy.get('input[type="file"][name="image"]').selectFile('cypress/fixtures/e2e-1x1.png', { force: true });
    cy.contains('button', '📸 Publier').click();
    cy.contains('✅ Article publié avec succès', { timeout: 120000 }).should('be.visible');

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
    // Attendre le passage text-only → image-only après fetch getMedia (évite closest sur --text-only).
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
