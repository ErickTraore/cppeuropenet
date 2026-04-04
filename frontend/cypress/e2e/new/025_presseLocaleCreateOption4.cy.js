/**
 * Presse Locale - Create option 4 (titre + contenu + photo + vidéo).
 * - Chaîne 1–4 : CRUD via API (7005), sans médias attachés.
 * - Dernier test : formulaire FormPresseLocaleThumbnailVideo (UI) → message + uploadImage + uploadVideo sur /api/media-locale.
 * Aligné sur 016 (presse générale).
 */
describe('Presse Locale - Create (option 4: titre + contenu + photo + vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const usersApi = 'http://localhost:7001/api/users';
  const apiBase = () => 'http://localhost:7005/api/messages/';
  const apiMessages = () => apiBase() + '?categ=presse-locale&siteKey=cppEurope';
  const contenu = 'E2E Contenu article avec photo et vidéo.';
  const titreRemplace = 'titre remplacé Option4';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";
  let titre;
  let createdMessage;

  before(() => {
    titre = 'E2E Option4 Presse Locale ' + Date.now();
  });

  beforeEach(() => {
    cy.request({
      method: 'POST',
      url: `${usersApi}/login`,
      body: { email: adminEmail, password: adminPassword },
    }).then((res) => {
      expect(res.status).to.eq(200);
      cy.wrap(res.body.accessToken).as('accessToken');
    });
  });

  it('crée un article via API', () => {
    cy.get('@accessToken').then((token) => {
      cy.request({
        method: 'POST',
        url: apiBase() + 'new/',
        headers: { Authorization: 'Bearer ' + token },
        body: { title: titre, content: contenu, categ: 'presse-locale', siteKey: 'cppEurope' },
      }).its('status').should('be.oneOf', [200, 201]);
    });
  });

  it('vérifie en API et garde le message', () => {
    cy.get('@accessToken').then((token) => {
      cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token } }).then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => m.title === titre);
        expect(found).to.exist;
        createdMessage = found;
      });
    });
  });

  it('vérifie le contenu créé via API', () => {
    expect(createdMessage).to.exist;
    cy.get('@accessToken').then((token) => {
      cy.request({ method: 'GET', url: apiMessages(), headers: { Authorization: 'Bearer ' + token } }).then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => m.id === createdMessage.id);
        expect(found).to.exist;
        expect(found.title).to.eq(titre);
        expect(found.content).to.eq(contenu);
      });
    });
  });

  it('remplace titre/contenu via API et vérifie', () => {
    expect(createdMessage).to.exist;
    cy.get('@accessToken').then((token) => {
      cy.request({
        method: 'PUT',
        url: apiBase() + createdMessage.id,
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: { ...createdMessage, title: titreRemplace, content: contenuRemplace, categ: 'presse-locale', siteKey: 'cppEurope' },
      }).its('status').should('eq', 200);
    });
  });

  it('publie via UI (miniature + vidéo) : messages/new puis uploadImage + uploadVideo sur /api/media-locale', () => {
    const titreUi = `E2E Option4 UI Presse Locale ${Date.now()}`;
    const contenuUi =
      'E2E option 4 UI presse locale : FormPresseLocaleThumbnailVideo — même chaîne média que photo/vidéo seuls.';

    cy.loginByUi(adminEmail, adminPassword);
    cy.dismissSessionModalIfPresent();

    cy.visit('/#admin-presse-locale');
    cy.get('div.App.authenticated', { timeout: 30000 }).should('exist');

    cy.get('#format', { timeout: 20000 }).should('be.visible').select('article-thumbnail-video');
    cy.get('input[name="title"]', { timeout: 20000 }).should('be.visible').clear().type(titreUi);
    cy.get('textarea[name="content"]').clear().type(contenuUi);

    cy.get('input[type="file"][name="image"]').selectFile('cypress/fixtures/e2e-1x1.png', { force: true });
    cy.get('input[type="file"][name="video"]').selectFile('cypress/fixtures/videos/video-1.mp4', { force: true });

    cy.intercept('POST', '**/api/presse-locale/messages/new**').as('presseLocMsgNew');
    cy.intercept('POST', '**/api/media-locale/uploadImage**').as('uploadImage');
    cy.intercept('POST', '**/api/media-locale/uploadVideo**').as('uploadVideo');

    cy.contains('button', '📨 Publier').click();

    cy.wait('@presseLocMsgNew', { timeout: 60000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@uploadImage', { timeout: 120000 }).its('response.statusCode').should('be.oneOf', [200, 201]);
    cy.wait('@uploadVideo', { timeout: 120000 }).its('response.statusCode').should('be.oneOf', [200, 201]);

    cy.contains('✅ Article publié avec succès', { timeout: 180000 }).should('be.visible');

    cy.window().then((win) => {
      const token = win.localStorage.getItem('accessToken');
      expect(token, 'token après login UI').to.be.a('string').and.not.be.empty;
      cy.request({
        method: 'GET',
        url: apiMessages(),
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => {
        const messages = Array.isArray(res.body) ? res.body : [];
        const found = messages.find((m) => m.title === titreUi);
        expect(found, 'message créé via UI retrouvé en API').to.exist;
        expect(found.content).to.eq(contenuUi);
      });
    });

    cy.cleanupPresseLocaleByTitle(titreUi);
  });
});
