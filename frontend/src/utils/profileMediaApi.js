import { resolveApiUrl } from './apiUrls';

/**
 * API user-media-profile : en local sur le navigateur, même origine que le front
 * (server.dev.js / server.prod.js proxifient vers userMediaProfile-backend) pour éviter le CORS.
 */
export function getProfileMediaApiBase() {
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      try {
        return new URL('/api/user-media-profile', window.location.origin).href.replace(/\/$/, '');
      } catch {
        /* ignore */
      }
    }
  }
  return resolveApiUrl(
    process.env.REACT_APP_MEDIA_API,
    'http://localhost:7017/api/user-media-profile',
    'MEDIA_API'
  );
}
