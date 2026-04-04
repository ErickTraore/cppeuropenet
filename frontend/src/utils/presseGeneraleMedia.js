import { resolveApiUrl } from './apiUrls';

const FALLBACK_MEDIA_GLE = 'http://localhost:7004/api/media';

/**
 * Backend mediaGle (upload + getMedia) pour la presse générale — pas user-media-profile (7017).
 * En local sur localhost, préférer le même origine (/api/media) pour éviter le CORS (proxy server.dev / nginx).
 */
export function getPresseGeneraleMediaApiBase() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      try {
        return new URL('/api/media', window.location.origin).href.replace(/\/$/, '');
      } catch {
        /* ignore */
      }
    }
  }

  const dedicated = process.env.REACT_APP_PRESSE_GENERALE_MEDIA_API;
  if (dedicated) {
    return resolveApiUrl(dedicated, FALLBACK_MEDIA_GLE, 'PRESSE_GENERALE_MEDIA_API');
  }
  const generic = process.env.REACT_APP_MEDIA_API || '';
  const looksLikeProfile = generic.includes('user-media-profile');
  const looksLikePresseMedia = generic.includes('/api/media') && !looksLikeProfile;
  if (generic && looksLikePresseMedia && !looksLikeProfile) {
    return resolveApiUrl(generic, FALLBACK_MEDIA_GLE, 'MEDIA_API');
  }
  return resolveApiUrl('', FALLBACK_MEDIA_GLE, 'PRESSE_GENERALE_MEDIA_API');
}

/**
 * Origine pour préfixer /api/uploads/... (vidéos, posters dans PresseVideoPlayer).
 * En local, suit le port du navigateur (8092, 3000, etc.) ; le fallback 8080 ne correspond souvent pas au serveur dev.
 */
export function getPresseGeneraleAssetOrigin() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return window.location.origin;
    }
  }
  const resolved = resolveApiUrl(process.env.REACT_APP_BASE_URL, 'http://localhost:8080', 'BASE_URL');
  try {
    return new URL(resolved).origin;
  } catch {
    return String(resolved).replace(/\/$/, '');
  }
}

/**
 * Id du message après POST presse `/messages/new` — doit être le même que celui stocké en mediaGle (getMedia/:messageId).
 */
export function parsePresseMessageIdFromCreateResponse(body) {
  if (!body || typeof body !== 'object') return null;
  const raw = body.id ?? body.messageId;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Les réponses getMedia renvoient path relatif (/api/uploads/...). Préfixer avec l'origine du serveur média. */
export function absolutizePresseGeneraleMediaUrl(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return pathOrUrl;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl;
  const base = getPresseGeneraleMediaApiBase();
  try {
    const origin = new URL(base).origin;
    if (pathOrUrl.startsWith('/')) return `${origin}${pathOrUrl}`;
  } catch {
    /* ignore */
  }
  return pathOrUrl;
}
