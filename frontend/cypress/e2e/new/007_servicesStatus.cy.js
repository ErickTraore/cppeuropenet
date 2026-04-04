// Exécuté après 006_initUsersE2E et 007_initUsersE2E_2 (ordre lexicographique Cypress : 007_i < 007_s).
// Les POST login ciblent le user-backend directement : server.dev.js (port 8082) ne proxifie pas /api.

describe('Vérification des services essentiels (Hostinger)', () => {
  const userApiBase = 'http://localhost:7001';
  it('La page /auth affiche Je me connecte', () => {
    cy.visit('/auth');
    cy.contains('Je me connecte').should('exist');
  });
  it('Frontend (React) doit répondre sur /', () => {
    cy.request({
      url: '/',
      failOnStatusCode: false,
    }).its('status').should('be.oneOf', [200, 304]);
  });

  it('Backend (user-backend) doit répondre sur /api/users/login', () => {
    const loginUrl = `${userApiBase}/api/users/login`;

    cy.request({
      method: 'POST',
      url: loginUrl,
      body: { email: 'user2026@cppeurope.net', password: 'user2026!' },
      failOnStatusCode: false,
    }).its('status').should('eq', 200);
  });

  it('MariaDB doit être accessible via le backend', () => {
    const loginUrl = `${userApiBase}/api/users/login`;

    cy.request({
      method: 'POST',
      url: loginUrl,
      body: { email: 'user2026@cppeurope.net', password: 'user2026!' },
      failOnStatusCode: false,
    }).then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.body).to.not.have.property('message', 'Erreur de connexion à la base de données');
    });
  });

  const presseApi = 'http://localhost:7012';

  it('presse générale (7012) : POST /api/messages/new existe — sans token → 401, pas 404', () => {
    cy.request({
      method: 'POST',
      url: `${presseApi}/api/messages/new`,
      body: { title: 'e2e-contract', content: 'c' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, 'si 404 la route est fausse — ex. REACT_APP_* avec /api/presse-generale sur le port direct').not.to.eq(
        404
      );
      expect(res.status).to.eq(401);
    });
  });

  it('presse générale (7012) : le chemin erroné /api/presse-generale/messages/new reste introuvable (404) sans nginx', () => {
    cy.request({
      method: 'POST',
      url: `${presseApi}/api/presse-generale/messages/new`,
      body: { title: 'x', content: 'y' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });
});
