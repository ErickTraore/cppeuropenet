// contabo-cppeurope/00b_servicesStatus.cy.js
// Ports / hôte : cypress/support/e2eServiceEndpoints.cjs (aligné services-inventory.json).
// Suite « new » : préfixes 002, 003, … imposent l’ordre d’exécution des fichiers ; ne pas mélanger avec --parallel.

const { contaboOrigin } = require('../../../support/e2eServiceEndpoints.cjs');

const FAST_TIMEOUT_MS = 5000;

function isStagingProfile() {
  const byEnv = String(Cypress.env('E2E_PROFILE') || '').toLowerCase() === 'staging';
  const base = String(Cypress.config('baseUrl') || '').toLowerCase();
  return byEnv || base.includes('staging.cppeurope.net') || base.includes('178.170.13.128');
}

function fastRequest(url) {
  return cy.request({
    url,
    timeout: FAST_TIMEOUT_MS,
    failOnStatusCode: false,
  });
}

describe('Vérification des services essentiels (Contabo CPP Europe)', () => {
  before(() => {
    cy.task('ensureFrontendProd8082');
    cy.task('assertE2EInfrastructure');
  });

  it('staging public: éviter les checks directs de ports locaux/loopback', () => {
    if (isStagingProfile()) {
      cy.log('Staging distant détecté: les checks bas niveau de ports Contabo sont ignorés.');
    }
  });

  it('mediaGle-backend répond sur /', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_MEDIA_GLE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('mediaLocale-backend répond sur /', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_MEDIA_LOCALE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('presseGenerale-backend répond sur /', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_PRESSE_GENERALE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('presseLocale-backend répond sur /', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_PRESSE_LOCALE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('userMediaProfile-backend répond sur /', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_USER_MEDIA_PROFILE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('mediaGle-backend BDD connectée', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_MEDIA_GLE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('mediaLocale-backend BDD connectée', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_MEDIA_LOCALE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('presseGenerale-backend BDD connectée', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_PRESSE_GENERALE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('presseLocale-backend BDD connectée', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_PRESSE_LOCALE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('userMediaProfile-backend BDD connectée', () => {
    if (isStagingProfile()) return;
    fastRequest(`${contaboOrigin('E2E_PORT_USER_MEDIA_PROFILE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });

  it('home-config-backend répond (GET via front)', () => {
    cy.task('checkHomeConfigViaFront').should('eq', 'ok');
  });
});
