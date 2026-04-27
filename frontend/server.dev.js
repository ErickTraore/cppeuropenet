const http = require('http');
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const MEDIA_HOST = process.env.MEDIA_STATIC_HOST || '127.0.0.1';
const MEDIA_PORT = parseInt(process.env.MEDIA_STATIC_PORT || '7017', 10);

const PRESSE_MEDIA_GLE_HOST = process.env.PRESSE_MEDIA_GLE_HOST || '127.0.0.1';
const PRESSE_MEDIA_GLE_PORT = parseInt(process.env.PRESSE_MEDIA_GLE_PORT || '7004', 10);

const PRESSE_MEDIA_LOC_HOST = process.env.PRESSE_MEDIA_LOC_HOST || '127.0.0.1';
const PRESSE_MEDIA_LOC_PORT = parseInt(process.env.PRESSE_MEDIA_LOC_PORT || '7008', 10);

const PRESSE_LOCALE_MSG_HOST = process.env.PRESSE_LOCALE_MSG_HOST || '127.0.0.1';
const PRESSE_LOCALE_MSG_PORT = parseInt(process.env.PRESSE_LOCALE_MSG_PORT || '7005', 10);

const PRESSE_GENERALE_MSG_HOST = process.env.PRESSE_GENERALE_MSG_HOST || '127.0.0.1';
const PRESSE_GENERALE_MSG_PORT = parseInt(process.env.PRESSE_GENERALE_MSG_PORT || '17012', 10);
const CONTABO_PATH_PREFIX_RAW = String(process.env.CONTABO_PATH_PREFIX || '').trim();
const CONTABO_PATH_PREFIX = CONTABO_PATH_PREFIX_RAW
  ? `/${CONTABO_PATH_PREFIX_RAW.replace(/^\/+|\/+$/g, '')}`
  : '';

const HOME_CONFIG_HOST = process.env.HOME_CONFIG_HOST || '127.0.0.1';
const HOME_CONFIG_PORT = parseInt(process.env.HOME_CONFIG_PORT || '7020', 10);

const USER_BACKEND_HOST = process.env.USER_BACKEND_HOST || '127.0.0.1';
const USER_BACKEND_PORT = parseInt(process.env.USER_BACKEND_PORT || '7001', 10);

function proxyRawPath(req, res, hostname, port, targetPath, proxyOpts = {}) {
  const headers = { ...req.headers, host: `${hostname}:${port}` };
  if (proxyOpts.omitOrigin) {
    delete headers.origin;
  }
  const options = {
    hostname,
    port,
    path: targetPath,
    method: req.method,
    headers,
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.dev] proxy', hostname, port, targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

function withContaboPrefix(targetPath) {
  if (!CONTABO_PATH_PREFIX) return targetPath;
  if (!targetPath || targetPath === '/') return CONTABO_PATH_PREFIX;
  return `${CONTABO_PATH_PREFIX}${targetPath.startsWith('/') ? targetPath : `/${targetPath}`}`;
}

/**
 * Les chemins /mediaprofile/* et /imagesprofile/* sont servis par userMediaProfile-backend (port 7017).
 * Le bundle React utilise des URLs same-origin (/mediaprofile/...) — sans proxy, le serveur (ex. :8082) renvoie 404
 * et les images du profil ne s'affichent pas en local (nginx en prod fait déjà le routage).
 */
function proxyToMedia(req, res, pathPrefix) {
  const suffix = req.url && req.url.startsWith('/') ? req.url : `/${req.url || ''}`;
  const targetPath = withContaboPrefix(pathPrefix + suffix);

  const options = {
    hostname: MEDIA_HOST,
    port: MEDIA_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${MEDIA_HOST}:${MEDIA_PORT}`,
    },
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.dev] proxy média', targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Media proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

/** mediaGle-backend (presse générale : getMedia, uploadImage, fichiers /api/uploads/…) — même origine que le front. */
function proxyToPresseMediaGle(req, res) {
  const pathOnly = (req.originalUrl || req.url || '').split('?')[0];
  const targetPath = withContaboPrefix(pathOnly);
  const options = {
    hostname: PRESSE_MEDIA_GLE_HOST,
    port: PRESSE_MEDIA_GLE_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${PRESSE_MEDIA_GLE_HOST}:${PRESSE_MEDIA_GLE_PORT}`,
    },
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.dev] proxy presse mediaGle', targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Presse media proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

/** mediaLocale-backend (presse locale : getMedia, upload, /api/uploads-locale/…) — même origine que le front. */
function proxyToPresseMediaLocale(req, res) {
  const pathOnly = (req.originalUrl || req.url || '').split('?')[0];
  const targetPath = withContaboPrefix(pathOnly);
  const options = {
    hostname: PRESSE_MEDIA_LOC_HOST,
    port: PRESSE_MEDIA_LOC_PORT,
    path: targetPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${PRESSE_MEDIA_LOC_HOST}:${PRESSE_MEDIA_LOC_PORT}`,
    },
  };

  const p = http.request(options, (proxRes) => {
    res.writeHead(proxRes.statusCode, proxRes.headers);
    proxRes.pipe(res);
  });
  p.on('error', (err) => {
    console.error('[server.dev] proxy presse mediaLocale', targetPath, err.message);
    if (!res.headersSent) {
      res.status(502).type('text/plain').send(`Presse locale media proxy error: ${err.message}`);
    }
  });
  req.pipe(p);
}

app.use(cors());

app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: 'ok', env: 'development' });
});

app.get('/api/__health/user-media-profile', (req, res) => {
  const opts = {
    hostname: MEDIA_HOST,
    port: MEDIA_PORT,
    path: '/api/ping',
    method: 'GET',
    headers: { host: `${MEDIA_HOST}:${MEDIA_PORT}` },
  };
  const p = http.request(opts, (proxRes) => {
    proxRes.on('data', () => {});
    proxRes.on('end', () => {
      const ok = proxRes.statusCode === 200;
      res.status(ok ? 200 : 502).json({ ok, upstreamStatus: proxRes.statusCode, upstream: `${MEDIA_HOST}:${MEDIA_PORT}` });
    });
  });
  p.on('error', (err) => {
    res.status(503).json({ ok: false, error: err.message, upstream: `${MEDIA_HOST}:${MEDIA_PORT}` });
  });
  p.end();
});

app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/users')) return next();
  proxyRawPath(req, res, USER_BACKEND_HOST, USER_BACKEND_PORT, o, { omitOrigin: true });
});

app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/user-media-profile')) return next();
  proxyRawPath(req, res, MEDIA_HOST, MEDIA_PORT, o, { omitOrigin: true });
});

app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/presse-locale')) return next();
  const target = withContaboPrefix(o.replace(/^\/api\/presse-locale/, '/api'));
  proxyRawPath(req, res, PRESSE_LOCALE_MSG_HOST, PRESSE_LOCALE_MSG_PORT, target, { omitOrigin: true });
});

// Messages presse générale :
// - /api/presse-generale/* (legacy/front) -> backend /api/*
// - /api/messages* (frontend historique) -> backend /api/messages*
app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (o.startsWith('/api/presse-generale')) {
    const target = withContaboPrefix(o.replace(/^\/api\/presse-generale/, '/api'));
    proxyRawPath(req, res, PRESSE_GENERALE_MSG_HOST, PRESSE_GENERALE_MSG_PORT, target, { omitOrigin: true });
    return;
  }
  if (o === '/api/messages' || o.startsWith('/api/messages/')) {
    proxyRawPath(req, res, PRESSE_GENERALE_MSG_HOST, PRESSE_GENERALE_MSG_PORT, withContaboPrefix(o), { omitOrigin: true });
    return;
  }
  next();
});

app.use((req, res, next) => {
  const o = req.originalUrl || '';
  if (!o.startsWith('/api/home-config')) return next();
  proxyRawPath(req, res, HOME_CONFIG_HOST, HOME_CONFIG_PORT, o, { omitOrigin: true });
});

app.use('/mediaprofile', (req, res) => proxyToMedia(req, res, '/mediaprofile'));
app.use('/imagesprofile', (req, res) => proxyToMedia(req, res, '/imagesprofile'));
app.use('/api/media', (req, res) => proxyToPresseMediaGle(req, res));
app.use('/api/uploads', (req, res) => proxyToPresseMediaGle(req, res));
app.use('/api/media-locale', (req, res) => proxyToPresseMediaLocale(req, res));
app.use('/api/uploads-locale', (req, res) => proxyToPresseMediaLocale(req, res));

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend DEV server running on port ${PORT}`);
  console.log(`  → Proxy /mediaprofile + /imagesprofile → http://${MEDIA_HOST}:${MEDIA_PORT}`);
  console.log(`  → Proxy /api/media → http://${PRESSE_MEDIA_GLE_HOST}:${PRESSE_MEDIA_GLE_PORT} (mediaGle presse générale)`);
  console.log(
    `  → Proxy /api/media-locale + /api/uploads-locale → http://${PRESSE_MEDIA_LOC_HOST}:${PRESSE_MEDIA_LOC_PORT} (presse locale)`
  );
  console.log(`  → Proxy /api/user-media-profile → http://${MEDIA_HOST}:${MEDIA_PORT}`);
  console.log(`  → Proxy /api/presse-generale + /api/messages → http://${PRESSE_GENERALE_MSG_HOST}:${PRESSE_GENERALE_MSG_PORT}`);
  console.log(`  → Proxy /api/presse-locale → http://${PRESSE_LOCALE_MSG_HOST}:${PRESSE_LOCALE_MSG_PORT}`);
  console.log(`  → Proxy /api/home-config → http://${HOME_CONFIG_HOST}:${HOME_CONFIG_PORT}`);
  console.log(`  → Proxy /api/users → http://${USER_BACKEND_HOST}:${USER_BACKEND_PORT}`);
});
