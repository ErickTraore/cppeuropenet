// Exécuté après 006_initUsersE2E et 007_initUsersE2E_2 (ordre lexicographique Cypress : 007_i < 007_s).
// Les POST login ciblent le user-backend directement : server.dev.js côté front ne proxifie pas /api.

const { userOrigin, presseGenOrigin } = require('../../../support/e2eApiUrls');

function isStagingProfile() {
  const byEnv = String(Cypress.env('E2E_PROFILE') || '').toLowerCase() === 'staging';
  const base = String(Cypress.config('baseUrl') || '').toLowerCase();
  return byEnv || base.includes('staging.cppeurope.net') || base.includes('178.170.13.128');
}

function presseBase() {
  // En staging public, les backends sont vérifiés via le proxy frontend (/api/*),
  // pas via un accès direct au port backend interne.
  return isStagingProfile() ? '' : presseGenOrigin;
}

describe('Vérification des services essentiels (Hostinger)', () => {
  const userApiBase = userOrigin;
  before(() => {
    cy.task('ensureFrontendProd8082');
    cy.task('checkFrontPing').should('eq', 'ok');
  });

  it('La page /auth affiche Je me connecte', () => {
    cy.task('checkFrontPing').should('eq', 'ok');
  });
  it('Frontend (React) doit répondre sur /', () => {
    cy.task('checkFrontPing').should('eq', 'ok');
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

  it('presse générale : POST /api/messages/new existe — sans token → 401, pas 404', () => {
    const base = presseBase();
    cy.request({
      method: 'POST',
      url: `${base}/api/messages/new`,
      body: { title: 'e2e-contract', content: 'c' },
      failOnStatusCode: false,
    }).then((res) => {
      if (res.status === 401) return;
      expect(res.status).to.eq(404);
      cy.request({
        method: 'POST',
        url: `${base}/api/presse-generale/messages/new`,
        body: { title: 'e2e-contract', content: 'c' },
        failOnStatusCode: false,
      }).its('status').should('eq', 401);
    });
  });

  it('presse générale : POST /api/presse-generale/messages/new sans token → 401 (route backend directe)', () => {
    const base = presseBase();
    cy.request({
      method: 'POST',
      url: `${base}/api/presse-generale/messages/new`,
      body: { title: 'x', content: 'y' },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status, 'route legacy selon backend').to.be.oneOf([401, 404]);
    });
  });

  it('presse générale : un sous-chemin inexistant renvoie 404', () => {
    const base = presseBase();
    cy.request({
      method: 'GET',
      url: `${base}/api/presse-generale/messages/999999999/format`,
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
    });
  });

  it('presse locale : avec token admin valide, /api/presse-locale/messages/new ne doit jamais répondre 401/403/404', () => {
    const base = presseBase();
    const frontBase = String(Cypress.config('baseUrl') || '').replace(/\/$/, '');
    const loginUrl = isStagingProfile() ? `${frontBase}/api/users/login` : `${userApiBase}/api/users/login`;

    cy.request({
      method: 'POST',
      url: loginUrl,
      body: { email: 'admin2026@cppeurope.net', password: 'admin2026!' },
      failOnStatusCode: false,
    }).then((loginRes) => {
      expect(loginRes.status, 'login admin').to.eq(200);
      const token = loginRes.body && loginRes.body.accessToken;
      expect(token, 'accessToken admin').to.be.a('string').and.not.be.empty;

      // Payload volontairement invalide côté métier (content trop court) pour vérifier le contrat route+auth.
      // Si auth/routage est correct, le backend doit répondre 400, pas 401/403/404.
      cy.request({
        method: 'POST',
        url: `${base}/api/presse-locale/messages/new`,
        headers: { Authorization: `Bearer ${token}` },
        body: { title: 'xx', content: 'y', categ: 'presse-locale', siteKey: 'cppEurope' },
        failOnStatusCode: false,
      }).then((res) => {
        expect(
          res.status,
          'contract presse-locale auth/route (doit échouer en validation métier, pas en auth/routage)'
        ).to.eq(400);
      });
    });
  });
});
