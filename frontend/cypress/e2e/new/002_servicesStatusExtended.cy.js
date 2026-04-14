// contabo-cppeurope/00b_servicesStatus.cy.js
// Ports / hôte : cypress/support/e2eServiceEndpoints.cjs (aligné services-inventory.json).
// Suite « new » : préfixes 002, 003, … imposent l’ordre d’exécution des fichiers ; ne pas mélanger avec --parallel.

const { contaboOrigin } = require('../../support/e2eServiceEndpoints.cjs');

describe('Vérification des services essentiels (Contabo CPP Europe)', () => {
  before(() => {
    cy.task('ensureFrontendProd8082');
    cy.task('assertE2EInfrastructure');
  });
  it('mediaGle-backend répond sur /', () => {
    cy.request(`${contaboOrigin('E2E_PORT_MEDIA_GLE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('mediaLocale-backend répond sur /', () => {
    cy.request(`${contaboOrigin('E2E_PORT_MEDIA_LOCALE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('presseGenerale-backend répond sur /', () => {
    cy.request(`${contaboOrigin('E2E_PORT_PRESSE_GENERALE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('presseLocale-backend répond sur /', () => {
    cy.request(`${contaboOrigin('E2E_PORT_PRESSE_LOCALE')}/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('userMediaProfile-backend répond sur /', () => {
    const base = Cypress.config('baseUrl');
    cy.request(`${base}/api/user-media-profile/`).its('status').should('be.oneOf', [200, 304]);
  });

  it('mediaGle-backend BDD connectée', () => {
    cy.request(`${contaboOrigin('E2E_PORT_MEDIA_GLE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('mediaLocale-backend BDD connectée', () => {
    cy.request(`${contaboOrigin('E2E_PORT_MEDIA_LOCALE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('presseGenerale-backend BDD connectée', () => {
    cy.request(`${contaboOrigin('E2E_PORT_PRESSE_GENERALE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('presseLocale-backend BDD connectée', () => {
    cy.request(`${contaboOrigin('E2E_PORT_PRESSE_LOCALE')}/api/ping`)
      .its('status')
      .should('be.oneOf', [200, 401, 400]);
  });
  it('userMediaProfile-backend BDD connectée', () => {
    const base = Cypress.config('baseUrl');
    cy.request(`${base}/api/__health/user-media-profile`)
      .its('status')
      .should('eq', 200);
    cy.request(`${base}/api/__health/user-media-profile`).its('body.ok').should('be.true');
  });

  it('home-config-backend répond (GET via front)', () => {
    const base = Cypress.config('baseUrl');
    cy.request(`${base}/api/home-config`).its('status').should('eq', 200);
    cy.request(`${base}/api/home-config`).its('body.categories').should('have.length', 3);
  });
});
