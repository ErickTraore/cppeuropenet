/**
 * URLs API E2E — alignées sur e2eServiceEndpoints.cjs (127.0.0.1 + ports inventaire).
 * Évite localhost : sur macOS, « localhost » et « 127.0.0.1 » peuvent ne pas être strictement équivalents (résolution / IPv6).
 */
const { E2E_ENV, contaboOrigin } = require('./e2eServiceEndpoints.cjs');

function isBrowserRuntime() {
  return typeof Cypress !== 'undefined';
}

function sameOriginBaseIfStaging() {
  if (!isBrowserRuntime()) return null;
  const byEnv = String(Cypress.env('E2E_PROFILE') || '').toLowerCase() === 'staging';
  const base = String(Cypress.config('baseUrl') || '');
  const byUrl = /93\.127\.167\.134:9085|staging\.cppeurope\.net/i.test(base);
  if (!byEnv && !byUrl) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

const sameOriginBase = sameOriginBaseIfStaging();
const userOrigin = sameOriginBase || contaboOrigin('E2E_PORT_USER_BACKEND');
const presseGenOrigin = sameOriginBase || contaboOrigin('E2E_PORT_PRESSE_GENERALE');
const presseLocOrigin = sameOriginBase || contaboOrigin('E2E_PORT_PRESSE_LOCALE');
const presseLocMessagesPath = sameOriginBase ? '/api/presse-locale/messages/' : '/api/messages/';

module.exports = {
  E2E_BACKEND_HOST: E2E_ENV.E2E_BACKEND_HOST,
  userOrigin,
  presseGenOrigin,
  presseLocOrigin,
  usersApi: `${userOrigin}/api/users`,
  presseGenMessages: `${presseGenOrigin}/api/messages/`,
  presseLocMessages: `${presseLocOrigin}${presseLocMessagesPath}`,
  presseLocMessagesList: `${presseLocOrigin}${presseLocMessagesPath}?categ=presse-locale&siteKey=cppEurope`,
  /** GET/POST health endpoint direct sur un port inventaire (même hôte que la gate e2eInfrastructure). */
  servicePingUrl: (port, endpointPath = '/api/ping') => {
    const p = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;
    return `http://${E2E_ENV.E2E_BACKEND_HOST}:${port}${p}`;
  },
};
