import { resolveApiUrl } from './apiUrls';

/**
 * API profile media : le profil utilisateur vit sur /api/user-media-profile.
 * Ce préfixe est proxyfié par le front vers le backend user-media-profile en local,
 * en E2E et en production.
 */
export function getProfileMediaApiBase() {
  if (typeof window !== 'undefined') {
    try {
      return new URL('/api/user-media-profile', window.location.origin).href.replace(/\/$/, '');
    } catch {
      /* ignore */
    }
  }
  return resolveApiUrl(
    process.env.REACT_APP_MEDIA_API,
    'http://localhost:7007/api/user-media-profile',
    'MEDIA_API'
  );
}
