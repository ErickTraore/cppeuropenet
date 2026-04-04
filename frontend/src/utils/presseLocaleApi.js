import { resolveApiUrl } from './apiUrls';

const FALLBACK_MEDIA_LOCALE = 'http://localhost:7008/api/media-locale';

/**
 * Backend mediaLocale (upload + getMedia) pour la presse locale — pas presse générale (/api/media) ni user-media-profile.
 * En local, même origine (/api/media-locale) via proxy (server.dev / server.prod).
 */
export function getPresseLocaleMediaApiRoot() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      try {
        return new URL('/api/media-locale', window.location.origin).href.replace(/\/$/, '');
      } catch {
        /* ignore */
      }
    }
  }

  const dedicated = process.env.REACT_APP_PRESSE_LOCALE_MEDIA_API;
  if (dedicated) {
    return resolveApiUrl(dedicated, FALLBACK_MEDIA_LOCALE, 'PRESSE_LOCALE_MEDIA_API');
  }

  const generic = process.env.REACT_APP_MEDIA_API || '';
  const looksLikeProfile = generic.includes('user-media-profile');
  const looksLikeGeneraleOnly = generic.includes('/api/media') && !generic.includes('media-locale');
  const looksLikeLocale = generic.includes('media-locale');
  if (generic && looksLikeLocale && !looksLikeProfile && !looksLikeGeneraleOnly) {
    return resolveApiUrl(generic, FALLBACK_MEDIA_LOCALE, 'MEDIA_API');
  }
  return resolveApiUrl('', FALLBACK_MEDIA_LOCALE, 'PRESSE_LOCALE_MEDIA_API');
}

/** Base messages presse locale (CRUD). En local, même origine : proxy /api/presse-locale → presseLocale-backend. */
export function getPresseLocaleApiRoot() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      try {
        return new URL('/api/presse-locale', window.location.origin).href.replace(/\/$/, '');
      } catch {
        /* ignore */
      }
    }
  }
  return resolveApiUrl(
    process.env.REACT_APP_PRESSE_LOCALE_API,
    'http://localhost:7005/api',
    'PRESSE_LOCALE_API'
  );
}

export function getPresseLocaleMediaOrigin() {
  try {
    const u = new URL(getPresseLocaleMediaApiRoot());
    return `${u.protocol}//${u.host}`;
  } catch {
    return 'http://localhost:7008';
  }
}

/** Chemins relatifs /api/uploads-locale/… → URL absolue (même origine en local avec proxy). */
export function absolutizePresseLocaleMediaPath(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return pathOrUrl;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const base = getPresseLocaleMediaApiRoot();
  try {
    const origin = new URL(base).origin;
    if (pathOrUrl.startsWith('/')) return `${origin}${pathOrUrl}`;
  } catch {
    /* ignore */
  }
  return pathOrUrl;
}
