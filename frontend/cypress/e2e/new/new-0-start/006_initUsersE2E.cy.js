// IMPORTANT : lancer ce test depuis le dossier 'frontend' avec :
// cd hostinger-cppeurope/frontend && npx cypress run --spec cypress/e2e/01_initUsersE2E.cy.js
/**
 * 01 - Initialisation E2E :
 * - Supprime les utilisateurs admin2026@cppeurope.net et user2026@cppeurope.net s'ils existent
 * - Crée ces deux utilisateurs via l'API d'inscription
 * - Vérifie la connexion pour chaque compte
 */

describe('01 - Init E2E : création et connexion admin/user', () => {
  const adminEmail = 'admin2026@cppeurope.net';
  const adminPassword = 'admin2026!';
  const userEmail = 'user2026@cppeurope.net';
  const userPassword = 'user2026!';
  const { userOrigin } = require('../../../support/e2eApiUrls');
  const apiBase = () => userOrigin;
  const frontendOrigin = new URL(Cypress.config('baseUrl')).origin;
  const corsProbeOrigin = String(Cypress.env('CORS_PROBE_ORIGIN') || frontendOrigin);

  it('Supprime admin2026 et user2026 s\'ils existent (route dev user-backend)', () => {
    cy.request({
      method: 'DELETE',
      url: `${apiBase()}/api/users/e2e-dev-seed/${encodeURIComponent(adminEmail)}`,
      failOnStatusCode: false,
    });
    cy.request({
      method: 'DELETE',
      url: `${apiBase()}/api/users/e2e-dev-seed/${encodeURIComponent(userEmail)}`,
      failOnStatusCode: false,
    });
  });

  it('Crée admin2026 via l\'API d\'inscription', () => {
    cy.request({
      method: 'POST',
      url: apiBase() + '/api/users/register',
      body: { email: adminEmail, password: adminPassword, isAdmin: true, role: 'admin' },
      failOnStatusCode: false
    }).then((res) => {
      expect([200, 201, 409]).to.include(res.status); // 409 si déjà existant
    });
  });

  it('Crée user2026 via l\'API d\'inscription', () => {
    cy.request({
      method: 'POST',
      url: apiBase() + '/api/users/register',
      body: { email: userEmail, password: userPassword, isAdmin: false, role: 'user' },
      failOnStatusCode: false
    }).then((res) => {
      expect([200, 201, 409]).to.include(res.status);
    });
  });

  it('Connexion admin2026 OK', () => {
    cy.request({
      method: 'POST',
      url: apiBase() + '/api/users/login',
      body: { email: adminEmail, password: adminPassword },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('accessToken');
    });
  });

  it('Connexion user2026 OK', () => {
    cy.request({
      method: 'POST',
      url: apiBase() + '/api/users/login',
      body: { email: userEmail, password: userPassword },
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('accessToken');
    });
  });

  it('Vérifie le CORS sur /api/users/login', () => {
    cy.request({
      method: 'OPTIONS',
      url: apiBase() + '/api/users/login',
      headers: {
        Origin: corsProbeOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      },
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.be.oneOf([200, 204]);
      expect(res.headers).to.have.property('access-control-allow-origin');
      expect(res.headers['access-control-allow-origin']).to.satisfy(
        (val) => val === '*' || val.includes(corsProbeOrigin)
      );
    });
  });

});
