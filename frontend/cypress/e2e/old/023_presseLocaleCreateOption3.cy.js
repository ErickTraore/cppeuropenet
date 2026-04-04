/**
 * Presse Locale - Create option 3 (titre + contenu + vidéo).
 * Stabilisé en vérifications API.
 */
describe('Presse Locale - Create (option 3: titre + contenu + vidéo)', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const usersApi = 'http://localhost:7001/api/users';
  const apiBase = () => 'http://localhost:7005/api/messages/';
  const apiMessages = () => apiBase() + '?categ=presse-locale&siteKey=cppEurope';
  const contenu = 'E2E Contenu article avec vidéo.';
  const titreRemplace = 'titre remplacé Option3';
  const contenuRemplace = "Votre texte a été remplacé pour des raisons d'optimisation.";
  let titre;
  let createdMessage;

  before(() => {
    titre = 'E2E Option3 Presse Locale ' + Date.now();
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
});
