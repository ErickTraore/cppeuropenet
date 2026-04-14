/**
 * URLs API E2E — alignées sur e2eServiceEndpoints.cjs (127.0.0.1 + ports inventaire).
 * Évite localhost : sur macOS, « localhost » et « 127.0.0.1 » peuvent ne pas être strictement équivalents (résolution / IPv6).
 */
const { E2E_ENV, contaboOrigin } = require('./e2eServiceEndpoints.cjs');

const userOrigin = contaboOrigin('E2E_PORT_USER_BACKEND');
const presseGenOrigin = contaboOrigin('E2E_PORT_PRESSE_GENERALE');
const presseLocOrigin = contaboOrigin('E2E_PORT_PRESSE_LOCALE');

module.exports = {
  E2E_BACKEND_HOST: E2E_ENV.E2E_BACKEND_HOST,
  userOrigin,
  presseGenOrigin,
  presseLocOrigin,
  usersApi: `${userOrigin}/api/users`,
  presseGenMessages: `${presseGenOrigin}/api/messages/`,
  presseLocMessages: `${presseLocOrigin}/api/messages/`,
  presseLocMessagesList: `${presseLocOrigin}/api/messages/?categ=presse-locale&siteKey=cppEurope`,
  /** GET /api/ping direct sur un port inventaire (même hôte que la gate e2eInfrastructure). */
  servicePingUrl: (port) => `http://${E2E_ENV.E2E_BACKEND_HOST}:${port}/api/ping`,
};
