// frontend/src/utils/apiUrls.js

// Helper to resolve API URLs in environments where Docker service hostnames (e.g. "user-backend")
// are not resolvable from the browser (e.g., when running Cypress on the host machine).
//
// It can also be overridden by Cypress via `Cypress.env()`.

const isBrowser = () => typeof window !== 'undefined';

const isLocalhost = () => isBrowser() && ['localhost', '127.0.0.1'].includes(window.location.hostname);

const isLoopbackHost = (hostname) => ['localhost', '127.0.0.1'].includes(String(hostname || '').toLowerCase());

const internalDockerHosts = new Set([
  'user-backend',
  'presse-generale-backend',
  'presse-locale-backend',
  'home-config-backend',
  'user-media-profile-backend',
  'media-backend',
  'media-gle-backend',
  'media-locale-backend',
]);

// When running Cypress (or any browser) on the host machine, Docker service names like
// "user-backend" are not resolvable. In that case we map to localhost ports where
// the services are published.
const dockerHostToLocalhost = {
  'user-backend': 'http://localhost:7001',
  'presse-generale-backend': 'http://localhost:7006',
  // Add more mappings if you expose other services on localhost
};

const tryParseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/**
 * Resolve an API URL while keeping the production config, but falling back to a localhost
 * host/port when running on localhost in the browser.
 *
 * @param envUrl The raw URL from process.env (e.g. REACT_APP_USER_API)
 * @param fallback A fallback URL to use when envUrl is falsy
 * @param cypressEnvKey Optional Cypress env key to override the URL when running in Cypress
 */
export const resolveApiUrl = (envUrl, fallback, cypressEnvKey) => {
  if (isBrowser() && window.Cypress && cypressEnvKey) {
    // Cypress.env() is disabled when allowCypressEnv is set to false.
    // Protect against runtime errors in that configuration.
    try {
      const cypressValue = window.Cypress.env(cypressEnvKey);
      if (cypressValue) {
        return cypressValue;
      }
    } catch (err) {
      // Ignore; we only use Cypress overrides when explicitly enabled.
    }
  }

  // REACT_APP_* = `/api/...` (sans host) : même origine que la page (nginx / staging).
  // Sinon tryParseUrl échoue et on retombe sur le fallback `http://localhost:7001/...`
  // → fetch navigateur vers localhost au lieu du proxy (login UI cassé hors local).
  if (typeof envUrl === 'string' && envUrl.startsWith('/') && isBrowser()) {
    return new URL(envUrl, window.location.origin).href;
  }

  const url = tryParseUrl(envUrl) || tryParseUrl(fallback);
  if (!url) {
    return envUrl || fallback || '';
  }

  if (isBrowser() && !isLocalhost()) {
    const host = String(url.hostname || '').toLowerCase();
    if (isLoopbackHost(host) || internalDockerHosts.has(host)) {
      return new URL(`${url.pathname}${url.search}`, window.location.origin).href;
    }
  }

  if (isLocalhost()) {
    // On localhost, resolve docker hostnames to the corresponding localhost ports.
    // This is needed when running Cypress or the dev server on the host machine.
    const replacement = dockerHostToLocalhost[url.hostname];
    if (replacement) {
      return `${replacement}${url.pathname}${url.search}`;
    }
  }

  return url.toString();
};
