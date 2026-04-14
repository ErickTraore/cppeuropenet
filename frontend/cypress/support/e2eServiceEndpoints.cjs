/**
 * Ports / hôte des backends Contabo pour les E2E — alignés sur services-inventory.json.
 * Source unique : importé par cypress.config.cjs (e2e.env) et par les specs (contaboOrigin).
 * Pour override shell : définir CYPRESS_E2E_* avant cypress run (nécessite allowCypressEnv: true)
 * ou modifier les littéraux ici (convention projet).
 */
const E2E_ENV = {
  E2E_BACKEND_HOST: '127.0.0.1',
  E2E_PORT_MEDIA_GLE: '7004',
  E2E_PORT_MEDIA_LOCALE: '7008',
  E2E_PORT_PRESSE_GENERALE: '7012',
  E2E_PORT_PRESSE_LOCALE: '7005',
  /** userMediaProfile-backend (services-inventory.json) — REACT_APP_MEDIA_API */
  E2E_PORT_USER_MEDIA_PROFILE: '7017',
  /** user-backend Hostinger (services-inventory.json) — cy.request direct */
  E2E_PORT_USER_BACKEND: '7001',
};

function contaboOrigin(portKey) {
  const host = E2E_ENV.E2E_BACKEND_HOST;
  const port = E2E_ENV[portKey];
  if (!host || !port) {
    throw new Error(`e2eServiceEndpoints: clé manquante ou invalide (${portKey})`);
  }
  return `http://${host}:${port}`;
}

module.exports = { E2E_ENV, contaboOrigin };
