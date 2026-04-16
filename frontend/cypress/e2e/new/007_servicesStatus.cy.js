// Exécuté après 006_initUsersE2E et 007_initUsersE2E_2 (ordre lexicographique Cypress : 007_i < 007_s).
// Les POST login ciblent le user-backend directement : server.dev.js (front ex. :8082) ne proxifie pas /api.

const { userOrigin, presseGenOrigin, E2E_PROFILE } = require('../../support/e2eApiUrls');
const isStagingProfile = String(E2E_PROFILE || 'local').toLowerCase() === 'staging';

describe('Vérification des services essentiels (Hostinger)', () => {
  const userApiBase = userOrigin;
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

  it('presse générale (7012) : POST /api/messages/new existe — sans token → 401, pas 404', function () {
    if (isStagingProfile) {
      this.skip();
    }
    cy.request({
      method: 'POST',
      url: `${presseGenOrigin}/api/messages/new`,
      body: { title: 'e2e-contract', content: 'c' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, 'si 404 la route est fausse — ex. REACT_APP_* avec /api/presse-generale sur le port direct').not.to.eq(
        404
      );
      expect(res.status).to.eq(401);
    });
  });

  it('presse générale (7012) : POST /api/presse-generale/messages/new sans token → 401 (route backend directe)', () => {
    cy.request({
      method: 'POST',
      url: `${presseGenOrigin}/api/presse-generale/messages/new`,
      body: { title: 'x', content: 'y' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, 'route canonique exposée par presseGenerale-backend').to.eq(401);
    });
  });

  it('presse générale (7012) : un sous-chemin inexistant renvoie 404', () => {
    cy.request({
      method: 'GET',
      url: `${presseGenOrigin}/api/presse-generale/messages/999999999/format`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });
});
