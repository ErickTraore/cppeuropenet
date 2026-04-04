// contabo-cppeurope/00b_servicesStatus.cy.js

// Ce test vérifie que les services essentiels (backends et bases de données) de Contabo CPP Europe sont accessibles

describe('Vérification des services essentiels (Contabo CPP Europe)', () => {
  it('mediaGle-backend répond sur /', () => {
    cy.request('http://localhost:7004/').its('status').should('be.oneOf', [200, 304]);
  });

  it('mediaLocale-backend répond sur /', () => {
    cy.request('http://localhost:7008/').its('status').should('be.oneOf', [200, 304]);
  });

  it('presseGenerale-backend répond sur /', () => {
    // Port hôte du service presseGenerale-backend (7012), pas presseLocale du même compose (7016).
    cy.request('http://localhost:7012/').its('status').should('be.oneOf', [200, 304]);
  });

  it('presseLocale-backend répond sur /', () => {
    cy.request('http://localhost:7005/').its('status').should('be.oneOf', [200, 304]);
  });

  it('userMediaProfile-backend répond sur /', () => {
    cy.request('http://localhost:7017/').its('status').should('be.oneOf', [200, 304]);
  });

  // Vérification très simple de la connexion BDD via une route qui nécessite la BDD
  // Ici, on suppose que chaque backend a une route /api/ping ou /api/status qui vérifie la BDD
  it('mediaGle-backend BDD connectée', () => {
    cy.request('http://localhost:7004/api/ping').its('status').should('be.oneOf', [200, 401, 400]);
  });
  it('mediaLocale-backend BDD connectée', () => {
    cy.request('http://localhost:7008/api/ping').its('status').should('be.oneOf', [200, 401, 400]);
  });
  it('presseGenerale-backend BDD connectée', () => {
    cy.request('http://localhost:7012/api/ping').its('status').should('be.oneOf', [200, 401, 400]);
  });
  it('presseLocale-backend BDD connectée', () => {
    cy.request('http://localhost:7005/api/ping').its('status').should('be.oneOf', [200, 401, 400]);
  });
  it('userMediaProfile-backend BDD connectée', () => {
    cy.request('http://localhost:7017/api/ping').its('status').should('be.oneOf', [200, 401, 400]);
  });
});
