import { resolveApiUrl } from './apiUrls';

/**
 * API profile media : en navigateur on privilégie /api/media (nginx upstream stable)
 * pour éviter les erreurs de proxy local (/api/user-media-profile) en production.
 */
export function getProfileMediaApiBase() {
  if (typeof window !== 'undefined') {
    try {
      // Same-origin path served by nginx and mapped to Contabo media backend.
      return new URL('/api/media', window.location.origin).href.replace(/\/$/, '');
    } catch {
      /* ignore */
    }
  }
  return resolveApiUrl(
    process.env.REACT_APP_MEDIA_API,
    'http://localhost:7017/api/media',
    'MEDIA_API'
  );
}
